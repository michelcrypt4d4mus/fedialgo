/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from "./objects/account";
import MastoApi, { INSTANCE, LINKS, STATUSES, TAGS } from "./api";
import Storage from "../Storage";
import Toot from "./objects/toot";
import { ageString } from "../helpers/time_helpers";
import { Config } from "../config";
import { decorateHistoryScores, setTrendingRankToAvg, uniquifyTrendingObjs } from "./objects/trending_with_history";
import { lockExecution, logAndThrowError, traceLog } from '../helpers/log_helpers';
import { repairTag } from "./objects/tag";
import { TELEMETRY } from "../helpers/string_helpers";
import {
    ApiMutex,
    InstanceResponse,
    MastodonInstanceEmpty,
    MastodonInstance,
    MastodonInstances,
    StorageKey,
    TagWithUsageCounts,
    TrendingLink,
    TrendingObj,
    TrendingStorage,
    FEDIVERSE_KEYS,
} from "../types";
import {
    countValues,
    shuffle,
    sortKeysByValue,
    transformKeys,
    truncateToConfiguredLength,
    zipPromises
} from "../helpers/collection_helpers";

export enum FediverseTrendingType {
    STATUSES = "statuses",
    LINKS = "links",
    TAGS = "tags",
};

type InstanceDict = Record<string, MastodonInstance>;

const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;

export const TRENDING_MUTEXES: Partial<ApiMutex> = FEDIVERSE_KEYS.reduce(
    (mutexes, key) => {
        mutexes[key] = new Mutex();
        return mutexes;
    },
    {} as ApiMutex
);

interface FetchTrendingProps<T extends TrendingObj> {
    key: StorageKey;
    serverFxn: (server: MastodonServer) => Promise<T[]>;
    processingFxn: (objs: T[]) => Promise<T[]>,  // Uniquify and anything else needed
};


export default class MastodonServer {
    domain: string;

    // Helper methods for building URLs
    private static v1Url = (path: string) => `${API_V1}/${path}`;
    private static v2Url = (path: string) => `${API_V2}/${path}`;
    private static trendUrl = (path: string) => this.v1Url(`trends/${path}`);
    private endpointDomain = (endpoint: string) => `${this.domain}/${endpoint}`;
    private endpointUrl = (endpoint: string) => `https://${this.endpointDomain(endpoint)}`;

    constructor(domain: string) {
        this.domain = domain;
    };

    // Fetch the mastodon.v2.Instance object (MAU, version, languages, rules, etc) for this server
    async fetchServerInfo(): Promise<InstanceResponse> {
        if (MastodonServer.isNoMauServer(this.domain)) {
            console.debug(`[fetchServerInfo()] Instance info for '${this.domain}' is not available...`);
            return null;
        }

        try {
            return await this.fetch<MastodonInstance>(MastodonServer.v2Url(INSTANCE));
        } catch (error) {
            console.warn(`[fetchServerInfo()] Error for server '${this.domain}'`, error);
            return null;
        }
    }

    // Fetch toots that are trending on this server
    // TODO: Important: Toots returned by this method have not had setDependentProps() called on them yet!
    // Should return SerializableToot objects but that's annoying to make work w/the typesystem.
    async fetchTrendingStatuses(): Promise<Toot[]> {
        const toots = await this.fetchTrending<mastodon.v1.Status>(STATUSES);
        const trendingToots = toots.map(t => Toot.build(t));

        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => {
            toot.trendingRank = 1 + (trendingToots?.length || 0) - i;
            toot.sources = [StorageKey.FEDIVERSE_TRENDING_TOOTS];
        });

        return trendingToots;
    }

    // Get the links that are trending on this server
    async fetchTrendingLinks(): Promise<TrendingLink[]> {
        if (Config.noTrendingLinksServers.includes(this.domain)) {
            console.debug(`Trending links are not available for '${this.domain}', skipping...`);
            return [];
        }

        const numLinks = Config.numTrendingLinksPerServer;
        const trendingLinks = await this.fetchTrending<TrendingLink>(LINKS, numLinks);
        trendingLinks.forEach(decorateHistoryScores);
        return trendingLinks;
    }

    // Get the tags that are trending on 'server'
    async fetchTrendingTags(): Promise<TagWithUsageCounts[]> {
        const numTags = Config.numTrendingTagsPerServer;
        const trendingTags = await this.fetchTrending<TagWithUsageCounts>(TAGS, numTags);
        trendingTags.forEach(tag => decorateHistoryScores(repairTag(tag)));
        return trendingTags.filter(tag => !Config.invalidTrendingTags.includes(tag.name));
    }

    ///////////////////////////////////
    //        Private Methods       //
    //////////////////////////////////

    // Generic trending data fetcher: Fetch a list of objects of type T from a public API endpoint
    private async fetchTrending<T>(typeStr: string, limit?: number): Promise<T[]> {
        return this.fetchList<T>(MastodonServer.trendUrl(typeStr), limit);
    }

    // Fetch a list of objects of type T from a public API endpoint
    private async fetchList<T>(endpoint: string, limit?: number): Promise<T[]> {
        const label = endpoint.split("/").pop();
        const endpointURI = `'${this.domain}/${endpoint}`;
        let list: T[] = [];

        try {
            list = await this.fetch<T[]>(endpoint, limit);

            if (!list) {
                logAndThrowError(`No ${label} found! list: ${JSON.stringify(list)}`);
            } else if (list.length === 0) {
                console.warn(`[${endpointURI}] Empty array of ${label} found (but no actual error)`);
            }
        } catch (e) {
            console.warn(`[${endpointURI}] Failed to get ${label} data! Error:`, e);
            list = [];
        }

        return list as T[];
    }

    // Get data from a public API endpoint on a Mastodon server.
    private async fetch<T>(endpoint: string, limit?: number): Promise<T> {
        let url = this.endpointUrl(endpoint);
        if (limit) url += `?limit=${limit}`;
        traceLog(`[${this.endpointDomain(endpoint)}] fetching...`);
        const startedAt = new Date();
        const json = await axios.get<T>(url, { timeout: Config.timeoutMS });

        if (json.status === 200 && json.data) {
            traceLog(`[${this.endpointDomain(endpoint)}] fetch response ${ageString(startedAt)}:`, json.data);
            return transformKeys(json.data, camelCase) as T;
        } else {
            throw json;
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Static Methods (mostly for calling instance methods on the top 30 or so servers in parallel) //
    //////////////////////////////////////////////////////////////////////////////////////////////////

    // Collect all three kinds of trending data (links, tags, toots) in one call
    static async getTrendingData(): Promise<TrendingStorage> {
        const [links, tags, toots] = await Promise.all([
            this.fediverseTrendingLinks(),
            this.fediverseTrendingTags(),
            this.fediverseTrendingToots(),
        ]);

        return { links, tags, toots };
    }

    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots(): Promise<Toot[]> {
        return await this.fetchTrendingObjsFromAllServers<Toot>({
            key: StorageKey.FEDIVERSE_TRENDING_TOOTS,
            serverFxn: (server) => server.fetchTrendingStatuses(),
            processingFxn: async (toots) => {
                setTrendingRankToAvg(toots);
                return await Toot.buildToots(toots, StorageKey.FEDIVERSE_TRENDING_TOOTS);
            }
        });
    }

    // Get the top trending links from all servers
    static async fediverseTrendingLinks(): Promise<TrendingLink[]> {
        return await this.fetchTrendingObjsFromAllServers<TrendingLink>({
            key: StorageKey.FEDIVERSE_TRENDING_LINKS,
            serverFxn: (server) => server.fetchTrendingLinks(),
            processingFxn: async (links) => {
                return uniquifyTrendingObjs<TrendingLink>(links, link => link.url);
            }
        });
    }

    // Get the top trending tags from all servers
    static async fediverseTrendingTags(): Promise<TagWithUsageCounts[]> {
        return await this.fetchTrendingObjsFromAllServers<TagWithUsageCounts>({
            key: StorageKey.FEDIVERSE_TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                const uniqueTags = uniquifyTrendingObjs<TagWithUsageCounts>(tags, t => (t as TagWithUsageCounts).name);
                return truncateToConfiguredLength(uniqueTags, "numTrendingTags");
            }
        });
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getMastodonInstancesInfo(): Promise<MastodonInstances> {
        const logPrefix = `[${StorageKey.FEDIVERSE_POPULAR_SERVERS}]`;
        const releaseMutex = await lockExecution(TRENDING_MUTEXES[StorageKey.FEDIVERSE_POPULAR_SERVERS]!, logPrefix);

        try {
            let servers = await Storage.getIfNotStale<MastodonInstances>(StorageKey.FEDIVERSE_POPULAR_SERVERS);

            if (!servers) {
                servers = await this.fetchMastodonInstances();
                await Storage.set(StorageKey.FEDIVERSE_POPULAR_SERVERS, servers);
            }

            return servers;
        } finally {
            releaseMutex();
        }
    }

    // Returns true if the domain is known to not provide MAU and trending data via public API
    static isNoMauServer(domain: string): boolean {
        return Config.noMauServers.some(s => domain == s);
    }

    ///////////////////////////////////////
    //      Private Static Methods       //
    ///////////////////////////////////////

    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    private static async fetchMastodonInstances(): Promise<MastodonInstances> {
        const logPrefix = `[${StorageKey.FEDIVERSE_POPULAR_SERVERS}] fetchMastodonServersInfo():`;
        traceLog(`${logPrefix} fetching ${StorageKey.FEDIVERSE_POPULAR_SERVERS} info...`);
        const startedAt = new Date();

        // Find the servers which have the most accounts followed by the user to check for trends of interest
        const follows = await MastoApi.instance.getFollowedAccounts(); // TODO: this is a major bottleneck
        const followedUserDomainCounts = countValues<Account>(follows, account => account.homeserver());
        let mostFollowedDomains = sortKeysByValue(followedUserDomainCounts)
        mostFollowedDomains = mostFollowedDomains.filter(domain => !MastodonServer.isNoMauServer(domain));
        mostFollowedDomains = mostFollowedDomains.slice(0, Config.numServersToCheck);

        // Fetch Instance objects for the the Mastodon servers that have a lot of accounts followed by the
        // current Fedialgo. Filter out those below the userminServerMAU threshold
        let serverDict = await this.callForServers<InstanceResponse>(mostFollowedDomains, (s) => s.fetchServerInfo());
        serverDict = filterMinMAU(serverDict, Config.minServerMAU);
        const numActiveServers = Object.keys(serverDict).length;
        const numServersToAdd = Config.numServersToCheck - numActiveServers;  // Number of default servers to add

        // If we have haven't found enough servers yet add some known popular servers from the preconfigured list.
        // TODO: if some of the default servers barf we won't top up the list again
        if (numServersToAdd > 0) {
            console.log(`${logPrefix} Only ${numActiveServers} servers w/min ${Config.minServerMAU} MAU, adding some`);
            let extraDomains: string[] = [];

            if (Config.language != Config.defaultLanguage) {
                extraDomains = extraDomains.concat(Config.foreignLanguageServers[Config.language] || []);
                console.log(`${logPrefix} Using ${extraDomains.length} custom "${Config.language}" servers`);
            }

            extraDomains = extraDomains.concat(shuffle(Config.defaultServers));
            extraDomains = extraDomains.filter(s => !(s in serverDict)).slice(0, numServersToAdd);
            console.log(`${logPrefix} Adding ${extraDomains.length} default servers:`, extraDomains);
            const extraServerInfos = await this.callForServers<InstanceResponse>(extraDomains, (s) => s.fetchServerInfo());
            serverDict = {...serverDict, ...extraServerInfos};
        }

        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        const servers = Object.entries(serverDict).reduce(
            (serverDict, [domain, _instance]) => {
                // Replace any null responses with MastodonInstanceEmpty objs
                const instance = _instance ? (_instance as MastodonInstance) : ({} as MastodonInstanceEmpty);
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
        console.log(`${logPrefix} Fetched ${numServers} Instances ${ageString(startedAt)}:`, servers);
        return servers;
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    private static async getTopServerDomains(): Promise<string[]> {
        const servers = await this.getMastodonInstancesInfo();

        // Sort the servers by the % of MAU followed by the fedialgo user
        const topServerDomains = Object.keys(servers).sort(
            (a, b) => servers[b].followedPctOfMAU! - servers[a].followedPctOfMAU!
        );

        console.debug(`[${StorageKey.FEDIVERSE_POPULAR_SERVERS}] Top server domains:`, topServerDomains);
        return topServerDomains;
    }

    // Generic wrapper method to fetch trending data from all servers and process it into
    // an array of unique objects.
    private static async fetchTrendingObjsFromAllServers<T extends TrendingObj>(
        props: FetchTrendingProps<T>
    ): Promise<T[]> {
        const { key, processingFxn, serverFxn } = props;
        const logPrefix = `[${key}]`;
        const releaseMutex = await lockExecution(TRENDING_MUTEXES[key]!, logPrefix);
        const startedAt = new Date();

        try {
            let records = await Storage.getIfNotStale<T[]>(key);

            if (!records?.length) {
                const serverObjs = await this.callForAllServers<T[]>(serverFxn);
                traceLog(`${logPrefix} result from all servers:`, serverObjs);
                const flatObjs = Object.values(serverObjs).flat();
                records = await processingFxn(flatObjs);
                let msg = `[${TELEMETRY}] fetched ${records.length} unique records ${ageString(startedAt)}`;
                console.log(`${logPrefix} ${msg}`, records);
                await Storage.set(key, records);
            }

            return records;
        } finally {
            releaseMutex();
        }
    }

    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    private static async callForAllServers<T>(
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        const domains = await this.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    }

    // Call 'fxn' for a list of domains and return a dict keyed by domain
    private static async callForServers<T>(
        domains: string[],
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        return await zipPromises<T>(domains, async (domain) => fxn(new MastodonServer(domain)));
    }
};


// Return a dict of servers with MAU over the minServerMAU threshold
function filterMinMAU(serverInfos: Record<string, InstanceResponse>, minMAU: number): InstanceDict {
    const servers = Object.entries(serverInfos).reduce(
        (filtered, [domain, instanceObj]) => {
            if ((instanceObj?.usage?.users?.activeMonth || 0) >= minMAU) {
                filtered[domain] = instanceObj as MastodonInstance;
            }

            return filtered;
        },
        {} as InstanceDict
    );

    traceLog(`[filterMinMAU()] ${Object.keys(servers).length} servers with MAU >= ${minMAU}:`, servers);
    return servers;
};
