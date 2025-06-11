/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from "./objects/account";
import MastoApi from "./api";
import Storage from "../Storage";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { ageString } from "../helpers/time_helpers";
import { CacheKey, TagTootsCacheKey } from "../enums";
import { config, FEDIVERSE_CACHE_KEYS } from "../config";
import { countValues, shuffle, sortKeysByValue, transformKeys, zipPromiseCalls } from "../helpers/collection_helpers";
import { lockExecution } from '../helpers/log_helpers';
import Logger from '../helpers/logger';
import { TrendingType, buildCacheKeyDict } from '../enums';
import {
    decorateLinkHistory,
    decorateTagHistory,
    setTrendingRankToAvg,
    uniquifyTrendingObjs
} from "./objects/trending_with_history";
import {
    type MastodonInstance,
    type MastodonInstances,
    type TagWithUsageCounts,
    type TrendingLink,
    type TrendingObj,
    type TrendingData,
} from "../types";

export type InstanceResponse = MastodonInstance | null;
type InstanceDict = Record<string, MastodonInstance>;

const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const INSTANCE = "instance";
const LOG_PREFIX = `MastodonServer`;

const getLogger = Logger.logBuilder(LOG_PREFIX);

interface FetchTrendingProps<T extends TrendingObj> {
    key: CacheKey;
    serverFxn: (server: MastodonServer) => Promise<T[]>;
    processingFxn: (objs: T[]) => Promise<T[]>,  // Uniquify and anything else needed
};


/**
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 * Provides methods to fetch trending toots, tags, links, and server info, as well as utilities for
 * aggregating and processing trending data across multiple servers in the fediverse.
 *
 * @class
 * @property {string} domain - The domain of the server this MastodonServer object interacts with.
 * @property {Logger} logger - Logger instance for this server.
 */
export default class MastodonServer {
    domain: string;
    logger: Logger;

    // Helper methods for building URLs
    private static v1Url = (path: string) => `${API_V1}/${path}`;
    private static v2Url = (path: string) => `${API_V2}/${path}`;
    private static trendUrl = (path: string) => this.v1Url(`trends/${path}`);
    private static trendingMutexes = buildCacheKeyDict(() => new Mutex(), FEDIVERSE_CACHE_KEYS);

    /**
     * Constructs a MastodonServer instance for the given domain.
     * @param {string} domain - The domain of the Mastodon server.
     */
    constructor(domain: string) {
        this.domain = domain;
        this.logger = Logger.withParenthesizedName(LOG_PREFIX, domain);
    };

    /**
     * Fetch the mastodon.v2.Instance object (MAU, version, languages, rules, etc) for this server.
     * @returns {Promise<InstanceResponse>} The instance info or null if not available.
     */
    async fetchServerInfo(): Promise<InstanceResponse> {
        const logPrefix = `(fetchServerInfo())`;

        if (MastodonServer.isNoMauServer(this.domain)) {
            this.logger.debug(`${logPrefix} Instance info for '${this.domain}' is not available...`);
            return null;
        }

        try {
            return await this.fetch<MastodonInstance>(MastodonServer.v2Url(INSTANCE));
        } catch (error) {
            // TODO: we shouldn't have to catch this error here because zipPromises() will take care of it
            this.logger.warn(`${logPrefix} Error for server '${this.domain}'`, error);
            return null;
        }
    }

    /**
     * Fetch toots that are trending on this server.
     * Note: Returned toots have not had setDependentProps() called yet.
     * TODO: should return SerializableToot[] instead of mastodon.v1.Status but the type system is annoying.
     * @returns {Promise<Toot[]>} Array of trending Toot objects.
     */
    async fetchTrendingStatuses(): Promise<Toot[]> {
        const toots = await this.fetchTrending<mastodon.v1.Status>(TrendingType.STATUSES);
        const trendingToots = toots.map(t => Toot.build(t));

        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => {
            toot.trendingRank = 1 + (trendingToots?.length || 0) - i;
            toot.sources = [CacheKey.FEDIVERSE_TRENDING_TOOTS];
        });

        return trendingToots;
    }

    /**
     * Get the links that are trending on this server.
     * @returns {Promise<TrendingLink[]>} Array of trending links.
     */
    async fetchTrendingLinks(): Promise<TrendingLink[]> {
        if (config.fediverse.noTrendingLinksServers.includes(this.domain)) {
            this.logger.debug(`Trending links are not available for '${this.domain}', skipping...`);
            return [];
        }

        const numLinks = config.trending.links.numTrendingLinksPerServer;
        const trendingLinks = await this.fetchTrending<TrendingLink>(TrendingType.LINKS, numLinks);
        trendingLinks.forEach(decorateLinkHistory);
        return trendingLinks;
    }

    /**
     * Get the tags that are trending on this server.
     * @returns {Promise<TagWithUsageCounts[]>} Array of trending tags with usage counts.
     */
    async fetchTrendingTags(): Promise<TagWithUsageCounts[]> {
        const numTags = config.trending.tags.numTagsPerServer;
        let trendingTags = await this.fetchTrending<TagWithUsageCounts>(TrendingType.TAGS, numTags);
        trendingTags.forEach(tag => decorateTagHistory(tag));
        return trendingTags;
    }

    ///////////////////////////////////
    //        Private Methods       //
    //////////////////////////////////

    // Get data from a public API endpoint on a Mastodon server.
    private async fetch<T>(endpoint: string, limit?: number): Promise<T> {
        const url = this.endpointUrl(endpoint, limit);
        this.logger.deep(`Fetching "${url}"...`);
        const startedAt = new Date();
        const json = await axios.get<T>(url, { timeout: config.api.timeoutMS });

        if (json.status === 200 && json.data) {
            this.logger.deep(`(${endpoint}) fetch response ${ageString(startedAt)}:`, json.data);
            return transformKeys(json.data, camelCase) as T;
        } else {
            throw json;
        }
    }

    // Fetch a list of objects of type T from a public API endpoint
    private async fetchList<T>(endpoint: string, limit?: number): Promise<T[]> {
        const label = endpoint.split("/").pop();
        const endpointURI = `'${this.domain}/${endpoint}`;
        const logPrefix = `(${endpointURI})`;
        let list: T[] = [];

        try {
            list = await this.fetch<T[]>(endpoint, limit);

            if (!list) {
                getLogger(endpoint).logAndThrowError(`No ${label} found! list: ${JSON.stringify(list)}`);
            } else if (list.length === 0) {
                this.logger.warn(`${logPrefix} Empty array of ${label} found (but no actual error)`);
            }
        } catch (e) {
            this.logger.warn(`${logPrefix} Failed to get ${label} data! Error:`, e);
            list = [];
        }

        return list as T[];
    }

    // Generic trending data fetcher: Fetch a list of objects of type T from a public API endpoint
    private async fetchTrending<T>(typeStr: TrendingType, limit?: number): Promise<T[]> {
        return this.fetchList<T>(MastodonServer.trendUrl(typeStr), limit);
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Static Methods (mostly for calling instance methods on the top 30 or so servers in parallel) //
    //////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get the top trending links from all servers in the fediverse.
     * @static
     * @returns {Promise<TrendingLink[]>} Array of trending links across all servers.
     */
    static async fediverseTrendingLinks(): Promise<TrendingLink[]> {
        return await this.getTrendingObjsFromAllServers<TrendingLink>({
            key: CacheKey.FEDIVERSE_TRENDING_LINKS,
            serverFxn: (server) => server.fetchTrendingLinks(),
            processingFxn: async (links) => {
                return uniquifyTrendingObjs<TrendingLink>(links, link => link.url);
            }
        });
    }

    /**
     * Get the top trending tags from all servers, minus any invalid or muted tags.
     * @static
     * @returns {Promise<TagList>} TagList of trending tags across all servers.
     */
    static async fediverseTrendingTags(): Promise<TagList> {
        const tags = await this.getTrendingObjsFromAllServers<TagWithUsageCounts>({
            key: CacheKey.FEDIVERSE_TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                const trendingTagList = new TagList(tags, TagTootsCacheKey.TRENDING_TAG_TOOTS);
                trendingTagList.removeInvalidTrendingTags();
                await trendingTagList.removeMutedTags();
                return uniquifyTrendingObjs(trendingTagList.objs, t => (t as TagWithUsageCounts).name);
            }
        });

        return new TagList(tags, TagTootsCacheKey.TRENDING_TAG_TOOTS);
    }

    /**
     * Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
     * @static
     * @returns {Promise<Toot[]>} Array of trending Toots across all servers.
     */
    static async fediverseTrendingToots(): Promise<Toot[]> {
        return await this.getTrendingObjsFromAllServers<Toot>({
            key: CacheKey.FEDIVERSE_TRENDING_TOOTS,
            serverFxn: (server) => server.fetchTrendingStatuses(),
            processingFxn: async (toots) => {
                setTrendingRankToAvg(toots);
                const trendingToots = await Toot.buildToots(toots, CacheKey.FEDIVERSE_TRENDING_TOOTS);
                return trendingToots.sort((a, b) => (b.trendingRank || 0) - (a.trendingRank || 0));
            }
        });
    }

    /**
     * Get the server names that are most relevant to the user (appears in follows a lot, mostly).
     * @static
     * @returns {Promise<MastodonInstances>} Dictionary of MastodonInstances keyed by domain.
     */
    static async getMastodonInstancesInfo(): Promise<MastodonInstances> {
        const logger =  getLogger(CacheKey.FEDIVERSE_POPULAR_SERVERS, "getMastodonInstancesInfo");
        const releaseMutex = await lockExecution(this.trendingMutexes[CacheKey.FEDIVERSE_POPULAR_SERVERS]!, logger);

        try {
            let servers = await Storage.getIfNotStale<MastodonInstances>(CacheKey.FEDIVERSE_POPULAR_SERVERS);

            if (!servers) {
                servers = await this.fetchMastodonInstances();
                await Storage.set(CacheKey.FEDIVERSE_POPULAR_SERVERS, servers);
            }

            return servers;
        } finally {
            releaseMutex();
        }
    }

    /**
     * Collect all three kinds of trending data (links, tags, toots) in one call.
     * @static
     * @returns {Promise<TrendingData>} Object containing trending links, tags, toots, and servers.
     */
    static async getTrendingData(): Promise<TrendingData> {
        // TODO: would this be parallelized even without Promise.all?
        const [links, tags, toots, servers] = await Promise.all([
            this.fediverseTrendingLinks(),
            this.fediverseTrendingTags(),
            this.fediverseTrendingToots(),
            this.getMastodonInstancesInfo(),
        ]);

        return { links, servers, tags, toots };
    }

    ///////////////////////////////////////
    //      Private Static Methods       //
    ///////////////////////////////////////

    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    private static async fetchMastodonInstances(): Promise<MastodonInstances> {
        const logger = getLogger(CacheKey.FEDIVERSE_POPULAR_SERVERS, "fetchMastodonInstances");
        logger.trace(`Fetching ${CacheKey.FEDIVERSE_POPULAR_SERVERS} info...`);
        const startedAt = new Date();

        // Find the servers which have the most accounts followed by the user to check for trends of interest
        const follows = await MastoApi.instance.getFollowedAccounts(); // TODO: this is a major bottleneck
        const followedUserDomainCounts = countValues(follows, account => account.homeserver);
        logger.logSortedDict("followedUserDomainCounts", followedUserDomainCounts);
        let mostFollowedDomains = sortKeysByValue(followedUserDomainCounts)
        mostFollowedDomains = mostFollowedDomains.filter(domain => !MastodonServer.isNoMauServer(domain));
        mostFollowedDomains = mostFollowedDomains.slice(0, config.fediverse.numServersToCheck);

        // Fetch Instance objects for the the Mastodon servers that have a lot of accounts followed by the
        // current Fedialgo. Filter out those below the userminServerMAU threshold
        let serverDict = await this.callForServers<InstanceResponse>(mostFollowedDomains, (s) => s.fetchServerInfo());
        serverDict = filterMinMAU(serverDict, config.fediverse.minServerMAU);
        const numActiveServers = Object.keys(serverDict).length;
        const numServersToAdd = config.fediverse.numServersToCheck - numActiveServers;  // Number of default servers to add

        // If we have haven't found enough servers yet add some known popular servers from the preconfigured list.
        // TODO: if some of the default servers barf we won't top up the list again
        if (numServersToAdd > 0) {
            logger.log(`Only ${numActiveServers} servers w/min ${config.fediverse.minServerMAU} MAU, adding some`);
            let extraDomains: string[] = [];

            if (config.locale.language != config.locale.defaultLanguage) {
                extraDomains = extraDomains.concat(config.fediverse.foreignLanguageServers[config.locale.language] || []);
                logger.log(`Using ${extraDomains.length} custom "${config.locale.language}" servers`);
            }

            extraDomains = extraDomains.concat(shuffle(config.fediverse.defaultServers));
            extraDomains = extraDomains.filter(s => !(s in serverDict)).slice(0, numServersToAdd);
            logger.log(`Adding ${extraDomains.length} default servers:`, extraDomains);
            const extraServerInfos = await this.callForServers<InstanceResponse>(extraDomains, (s) => s.fetchServerInfo());
            serverDict = {...serverDict, ...extraServerInfos};
        }

        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        // Filter out any null responses.
        const servers = Object.entries(serverDict).filter(([_k, v]) => !!v).reduce(
            (serverDict, [domain, _instance]) => {
                const instance = _instance as MastodonInstance
                const domainAccountsFollowed = followedUserDomainCounts[domain] || 0;
                instance.MAU = _instance?.usage?.users?.activeMonth || 0;  // copy MAU to top level
                instance.followedPctOfMAU = instance.MAU ? (domainAccountsFollowed / instance.MAU) : 0;
                instance.followedPctOfMAU *= 100;
                serverDict[domain] = instance;
                return serverDict;
            },
            {} as MastodonInstances
        );

        const numServers = Object.keys(servers).length;
        logger.log(`Fetched ${numServers} Instances ${ageString(startedAt)}:`, servers);
        return servers;
    }

    // Generic wrapper to fetch trending data from all servers and process it into an array of unique objects
    private static async getTrendingObjsFromAllServers<T extends TrendingObj>(
        props: FetchTrendingProps<T>
    ): Promise<T[]> {
        const { key, processingFxn, serverFxn } = props;
        const logger = getLogger(key, "fetchTrendingObjsFromAllServers");
        const releaseMutex = await lockExecution(this.trendingMutexes[key]!, logger);
        const startedAt = new Date();

        try {
            let records = await Storage.getIfNotStale<T[]>(key);

            if (!records?.length) {
                const serverObjs = await this.callForTopServers<T[]>(serverFxn);
                // logger.trace(`result from all servers:`, serverObjs);
                const flatObjs = Object.values(serverObjs).flat();
                records = await processingFxn(flatObjs);
                logger.debug(`fetched ${records.length} unique records ${ageString(startedAt)}`, records);
                await Storage.set(key, records);
            }

            return records;
        } finally {
            releaseMutex();
        }
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    private static async getTopServerDomains(): Promise<string[]> {
        const servers = await this.getMastodonInstancesInfo();
        const logger = getLogger(CacheKey.FEDIVERSE_POPULAR_SERVERS, "getTopServerDomains");

        // Sort the servers by the % of MAU followed by the fedialgo user
        const topServerDomains = Object.keys(servers).sort(
            (a, b) => servers[b].followedPctOfMAU! - servers[a].followedPctOfMAU!
        );

        logger.debug(`Top server domains:`, topServerDomains);
        return topServerDomains;
    }

    // Call 'fxn' for a list of domains and return a dict keyed by domain
    private static async callForServers<T>(
        domains: string[],
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        return await zipPromiseCalls<T>(domains, async (domain) => fxn(new MastodonServer(domain)), getLogger());
    }

    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    private static async callForTopServers<T>(
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        const domains = await this.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    }

    private endpointUrl(endpoint: string, limit?: number) {
        return `https://${this.domain}/${endpoint}` + (limit ? `?limit=${limit}` : '');
    }

    // Returns true if the domain is known to not provide MAU and trending data via public API
    private static isNoMauServer(domain: string): boolean {
        return config.fediverse.noMauServers.some(s => domain == s);
    }
};


// Return a dict of servers with MAU over the minServerMAU threshold
function filterMinMAU(serverInfos: Record<string, InstanceResponse>, minMAU: number): InstanceDict {
    const logger = getLogger(CacheKey.FEDIVERSE_POPULAR_SERVERS, "filterMinMAU");

    const servers = Object.entries(serverInfos).reduce(
        (filtered, [domain, instanceObj]) => {
            if ((instanceObj?.usage?.users?.activeMonth || 0) >= minMAU) {
                filtered[domain] = instanceObj as MastodonInstance;
            }

            return filtered;
        },
        {} as InstanceDict
    );

    logger.trace(`${Object.keys(servers).length} servers with MAU >= ${minMAU}:`, servers);
    return servers;
};
