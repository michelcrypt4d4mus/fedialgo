/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import MastoApi from "./api";
import Storage from "../Storage";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { ageString } from "../helpers/time_helpers";
import { config } from "../config";
import { countValues, shuffle, sortKeysByValue, transformKeys, zipPromiseCalls } from "../helpers/collection_helpers";
import { FediverseCacheKey, TagTootsCategory, TrendingType, simpleCacheKeyDict } from '../enums';
import { lockExecution } from '../helpers/mutex_helpers';
import { Logger } from '../helpers/logger';
import { optionalSuffix } from "../helpers/string_helpers";
import {
    decorateLinkHistory,
    decorateTagHistory,
    setTrendingRankToAvg,
    uniquifyTrendingObjs,
} from "./objects/trending_with_history";
import {
    type InstanceResponse,
    type MastodonInstance,
    type MastodonInstances,
    type TagWithUsageCounts,
    type TrendingData,
    type TrendingLink,
    type TrendingObj,
} from "../types";

type InstanceDict = Record<string, MastodonInstance>;

const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const INSTANCE = "instance";
const LOG_PREFIX = `MastodonServer`;

const buildLogger = Logger.logBuilder(LOG_PREFIX);
const loggers: Record<FediverseCacheKey, Logger> = Logger.buildEnumLoggers(FediverseCacheKey);
const mutexes = simpleCacheKeyDict(() => new Mutex(), Object.values(FediverseCacheKey))

function getLogger(key: FediverseCacheKey, methodName?: string): Logger {
    return methodName ? loggers[key].tempLogger(methodName) : loggers[key];
};

interface FetchTrendingProps<T extends TrendingObj> {
    key: FediverseCacheKey;
    serverFxn: (server: MastodonServer) => Promise<T[]>;
    processingFxn: (objs: T[]) => Promise<T[]>,  // Uniquify and anything else needed
};


/**
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 * Provides methods to fetch trending toots, tags, links, and server info, as well as utilities for
 * aggregating and processing trending data across multiple servers in the fediverse.
 * @class
 * @property {string} domain - Domain of the server this {@linkcode MastodonServer} instance interacts with.
 * @property {Logger} logger - {@linkcode Logger} instance for this server.
 */
export default class MastodonServer {
    domain: string;
    logger: Logger;

    /**
     * Constructs a {@linkcode MastodonServer} instance for the given domain.
     * @param {string} domain - The domain of the Mastodon server.
     */
    constructor(domain: string) {
        this.domain = domain;
        this.logger = Logger.withParenthesizedName(LOG_PREFIX, domain);
    }

    /**
     * Fetch the {@link https://docs.joinmastodon.org/entities/Instance/ mastodon.v2.Instance} (MAU,
     * version, languages, rules, etc) for this server.
     * @returns {Promise<InstanceResponse>} The instance info or null if not available.
     */
    async fetchServerInfo(): Promise<InstanceResponse> {
        try {
            return await this.fetch<MastodonInstance>(MastodonServer.v2Url(INSTANCE));
        } catch (error) {
            // TODO: we shouldn't have to catch this error here because zipPromises() will take care of it
            this.logger.tempLogger('fetchServerInfo').warn(`Error for server '${this.domain}'`, error);
            return null;
        }
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
        return trendingLinks.map(decorateLinkHistory);
    }

    /**
     * Fetch {@linkcode Toot}s that are trending on this server.
     * Note: Returned {@linkcode Toot}s have not had {@linkcode Toot.completeProperties} called yet.
     * @returns {Promise<Toot[]>} Array of trending Toot objects.
     */
    async fetchTrendingStatuses(): Promise<Toot[]> {
        const toots = await this.fetchTrending<mastodon.v1.Status>(TrendingType.STATUSES);

        return toots.map((t, i) => {
            const toot = Toot.build(t);
            toot.sources = [FediverseCacheKey.TRENDING_TOOTS];
            // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
            // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
            toot.trendingRank = 1 + (toots.length || 0) - i;
            return toot;
        });
    }

    /**
     * Get the tags that are trending on this server.
     * @returns {Promise<TagWithUsageCounts[]>} Array of trending tags with usage counts.
     */
    async fetchTrendingTags(): Promise<TagWithUsageCounts[]> {
        const numTags = config.trending.tags.numTagsPerServer;
        const trendingTags = await this.fetchTrending<TagWithUsageCounts>(TrendingType.TAGS, numTags);
        return trendingTags.map(decorateTagHistory);
    }

    ///////////////////////////////////
    //        Private Methods       //
    //////////////////////////////////

    /**
     * Get data from a public API endpoint on a Mastodon server.
     * @private
     * @param {string} endpoint - The API endpoint to fetch data from.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T>} The data fetched from the endpoint, with keys transformed to camelCase.
     */
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

    /**
     * Fetch a list of objects of type T from a public API endpoint
     * @private
     * @param {string} endpoint - The API endpoint to fetch data from.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T[]>} Array of objects of type T.
     */
    private async fetchList<T>(endpoint: string, limit?: number): Promise<T[]> {
        const label = endpoint.split("/").pop();
        const endpointURI = `'${this.domain}/${endpoint}`;
        const logger = this.logger.tempLogger(endpointURI);
        let list: T[] = [];

        try {
            list = await this.fetch<T[]>(endpoint, limit);

            if (!list) {
                logger.logAndThrowError(`No ${label} found! list: ${JSON.stringify(list)}`);
            } else if (list.length === 0) {
                logger.warn(`Empty array of ${label} found (but no actual error)`);
            }
        } catch (err) {
            const msg = `Failed to scrape trending ${label} from ${this.domain}, skipping...`;
            MastoApi.instance.recordApiError(msg, err, logger);
            list = [];
        }

        return list;
    }

    /**
     * Generic trending data fetcher: Fetch a list of objects of type T from a public API endpoint
     * @private
     * @param {string} trendingType - The type of trending data to fetch (e.g., 'statuses', 'tags', 'links').
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T[]>} Array of objects of type T.
     */
    private async fetchTrending<T>(trendingType: TrendingType, limit?: number): Promise<T[]> {
        return this.fetchList<T>(MastodonServer.trendUrl(trendingType), limit);
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
            key: FediverseCacheKey.TRENDING_LINKS,
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
            key: FediverseCacheKey.TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                const trendingTagList = new TagList(tags, TagTootsCategory.TRENDING);
                await trendingTagList.removeInvalidTrendingTags();
                return uniquifyTrendingObjs(trendingTagList.objs, t => (t as TagWithUsageCounts).name);
            }
        });

        return new TagList(tags, TagTootsCategory.TRENDING);
    }

    /**
     * Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
     * @static
     * @returns {Promise<Toot[]>} Array of trending Toots across all servers.
     */
    static async fediverseTrendingToots(): Promise<Toot[]> {
        const cacheKey = FediverseCacheKey.TRENDING_TOOTS;

        return await this.getTrendingObjsFromAllServers<Toot>({
            key: cacheKey,
            serverFxn: (server) => server.fetchTrendingStatuses(),
            processingFxn: async (toots) => {
                setTrendingRankToAvg(toots);
                const trendingToots = await Toot.buildToots(toots, cacheKey);
                return trendingToots.sort((a, b) => (b.trendingRank || 0) - (a.trendingRank || 0));
            }
        });
    }

    /**
     * Get the server names that are most relevant to the user (appears in follows a lot, mostly).
     * @static
     * @returns {Promise<MastodonInstances>} Dictionary of MastodonInstances keyed by domain.
     */
    static async getMastodonInstances(): Promise<MastodonInstances> {
        const cacheKey = FediverseCacheKey.POPULAR_SERVERS;
        const releaseMutex = await lockExecution(mutexes[cacheKey], getLogger(cacheKey, "getMastodonInstances"));

        try {
            let servers = await Storage.getIfNotStale<MastodonInstances>(cacheKey);

            if (!servers) {
                servers = await this.fetchMastodonInstances();
                await Storage.set(cacheKey, servers);
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
            this.getMastodonInstances(),
        ]);

        return { links, servers, tags, toots };
    }

    ///////////////////////////////////////
    //      Private Static Methods       //
    ///////////////////////////////////////

    /**
     * Returns a dict of servers with MAU over the {@linkcode minServerMAU} threshold
     * and the ratio of the number of users followed on a server to the MAU of that server.
     * @private
     * @static
     * @returns {Promise<MastodonInstances>} Dictionary of MastodonInstances keyed by domain.
     */
    private static async fetchMastodonInstances(): Promise<MastodonInstances> {
        const logger = getLogger(FediverseCacheKey.POPULAR_SERVERS, "fetchMastodonInstances");
        logger.trace(`Fetching ${FediverseCacheKey.POPULAR_SERVERS} info...`);
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

    /**
     * Generic wrapper to fetch trending data from all servers and process it into an array of unique objects
     * @private
     * @static
     * @param {FetchTrendingProps<T>} props - Properties for fetching and processing trending data.
     * @returns {Promise<T[]>} Array of unique objects of type T.
     */
    private static async getTrendingObjsFromAllServers<T extends TrendingObj>(
        props: FetchTrendingProps<T>
    ): Promise<T[]> {
        const { key, processingFxn, serverFxn } = props;
        const logger = getLogger(key, "fetchTrendingObjsFromAllServers");
        const releaseMutex = await lockExecution(mutexes[key], logger);
        const startedAt = new Date();

        try {
            let objs = await Storage.getIfNotStale<T[]>(key);

            if (!objs?.length) {
                const serverObjs = await this.callForTopServers<T[]>(serverFxn);
                objs = await processingFxn(Object.values(serverObjs).flat());
                logger.debugWithTraceObjs(`fetched ${objs.length} objs ${ageString(startedAt)}`, objs);
                await Storage.set(key, objs);
            }

            return objs;
        } finally {
            releaseMutex();
        }
    }

    /**
     * Get the server names that are most relevant to the user (appears in follows a lot, mostly)
     * @private
     * @static
     * @returns {Promise<string[]>} Array of top server domains.
     */
    private static async getTopServerDomains(): Promise<string[]> {
        const logger = getLogger(FediverseCacheKey.POPULAR_SERVERS, "getTopServerDomains");
        const servers = await this.getMastodonInstances();

        // Sort the servers by the % of MAU followed by the fedialgo user
        const topServerDomains = Object.keys(servers).sort(
            (a, b) => servers[b].followedPctOfMAU! - servers[a].followedPctOfMAU!
        );

        logger.debug(`Top server domains:`, topServerDomains);
        return topServerDomains;
    }

    /**
     * Call 'fxn' for a list of domains and return a dict keyed by domain.
     * @private
     * @static
     * @template T - The type of the result returned by the function.
     * @param {string[]} domains - Array of server domains to call the function on.
     * @param {(server: MastodonServer) => Promise<T>} fxn - The function to call for each server.
     * @returns {Promise<Record<string, T>>} A promise that resolves to a dictionary with domains as keys and results of type T as values.
     */
    private static async callForServers<T>(
        domains: string[],
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        return await zipPromiseCalls<T>(domains, async (domain) => fxn(new MastodonServer(domain)), buildLogger());
    }

    /**
     * Call 'fxn' for all the top servers and return a dict keyed by server domain.
     * @private
     * @static
     * @template T - The type of the result returned by the function.
     * @param {(server: MastodonServer) => Promise<T>} fxn - The function to call for each server.
     * @returns {Promise<Record<string, T>>} A promise that resolves to a dictionary with domains as keys and results of type T as values.
     */
    private static async callForTopServers<T>(
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        const domains = await this.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    }

    /**
     * Build the full URL for a given API endpoint on this server, optionally adding a limit parameter.
     * @private
     * @param {string} endpoint - The API endpoint to build the URL for.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {string} The full URL for the API endpoint.
     */
    private endpointUrl(endpoint: string, limit?: number) {
        return `https://${this.domain}/${endpoint}${optionalSuffix(limit, `?limit=${limit}`, true)}`;
    }

    /**
     * Returns true if the domain is known to not provide MAU and trending data via public API
     * @private
     * @static
     * @param {string} domain - The domain to check.
     * @returns {boolean} True if the domain is in the `noMauServers` list, false otherwise.
     */
    private static isNoMauServer(domain: string): boolean {
        return config.fediverse.noMauServers.includes(domain);
    }

    /** Build a URL for a trending type (tags, links, toots). */
    private static trendUrl = (path: string) => this.v1Url(`trends/${path}`);
    /** Build a v1 API URL. */
    private static v1Url = (path: string) => `${API_V1}/${path}`;
    /** Build a v2 API URL. */
    private static v2Url = (path: string) => `${API_V2}/${path}`;
};


// Return a dict of servers with MAU over the minServerMAU threshold
function filterMinMAU(serverInfos: Record<string, InstanceResponse>, minMAU: number): InstanceDict {
    const logger = getLogger(FediverseCacheKey.POPULAR_SERVERS, "filterMinMAU");

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
