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
import { countValues, sortKeysByValue, transformKeys, zipPromises } from "../helpers/collection_helpers";
import { decorateHistoryScores, setTrendingRankToAvg, uniquifyTrendingObjs } from "./objects/trending_with_history";
import { ageString } from "../helpers/time_helpers";
import { lockMutex, logAndThrowError, traceLog } from '../helpers/log_helpers';
import { repairTag } from "./objects/tag";
import { TELEMETRY } from "../helpers/string_helpers";
import {
    ApiMutex,
    InstanceResponse,
    MastodonInstanceEmpty,
    MastodonInstance,
    MastodonInstances,
    StorableObj,
    StorageKey,
    TrendingLink,
    TrendingStorage,
    TrendingTag,
} from "../types";

export enum FediverseTrendingType {
    STATUSES = "statuses",
    LINKS = "links",
    TAGS = "tags",
};

const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;

const TRENDING_MUTEXES: Partial<ApiMutex> = {
    [StorageKey.FEDIVERSE_TRENDING_LINKS]: new Mutex(),
    [StorageKey.FEDIVERSE_TRENDING_TAGS]: new Mutex(),
    [StorageKey.FEDIVERSE_TRENDING_TOOTS]: new Mutex(),
    [StorageKey.POPULAR_SERVERS]: new Mutex(),
};

interface FetchTrendingProps<T> {
    key: StorageKey;
    serverFxn: (server: MastodonServer) => Promise<T[]>;
    processingFxn: (objs: T[]) => Promise<T[]>,  // Uniquify, send to Storage, and anything else needed
    loadingFxn?: (key: StorageKey) => Promise<StorableObj | null>
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
        if (Storage.getConfig().noMauServers.some(s => this.domain.startsWith(s))) {
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
        const trendingToots = toots.map(t => new Toot(t));

        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => {
            toot.trendingRank = 1 + (trendingToots?.length || 0) - i;
        });

        return trendingToots;
    }

    // Get the links that are trending on this server
    async fetchTrendingLinks(): Promise<TrendingLink[]> {
        if (Storage.getConfig().noTrendingLinksServers.includes(this.domain)) {
            console.debug(`Trending links are not available for '${this.domain}', skipping...`);
            return [];
        }

        const numLinks = Storage.getConfig().numTrendingLinksPerServer;
        const trendingLinks = await this.fetchTrending<TrendingLink>(LINKS, numLinks);
        trendingLinks.forEach(decorateHistoryScores);
        return trendingLinks;
    };

    // Get the tags that are trending on 'server'
    async fetchTrendingTags(): Promise<TrendingTag[]> {
        const numTags = Storage.getConfig().numTrendingTagsPerServer;
        const trendingTags = await this.fetchTrending<TrendingTag>(TAGS, numTags);
        trendingTags.forEach(tag => decorateHistoryScores(repairTag(tag)));
        return trendingTags;
    };

    ///////////////////////////////////
    //        Private Methods       //
    //////////////////////////////////

    // Generic trending data fetcher: Fetch a list of objects of type T from a public API endpoint
    private async fetchTrending<T>(typeStr: string, limit?: number): Promise<T[]> {
        return this.fetchList<T>(MastodonServer.trendUrl(typeStr), limit);
    };

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
    };

    // Get data from a public API endpoint on a Mastodon server.
    private async fetch<T>(endpoint: string, limit?: number): Promise<T> {
        let url = this.endpointUrl(endpoint);
        if (limit) url += `?limit=${limit}`;
        traceLog(`[${this.endpointDomain(endpoint)}] fetching...`);
        const startedAt = new Date();
        const json = await axios.get<T>(url, { timeout: Storage.getConfig().timeoutMS });

        if (json.status === 200 && json.data) {
            traceLog(`[${this.endpointDomain(endpoint)}] fetch response ${ageString(startedAt)}:`, json.data);
            return transformKeys(json.data, camelCase) as T;
        } else {
            throw json;
        }
    };

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
        return await this.fetchTrendingFromAllServers<Toot>({
            key: StorageKey.FEDIVERSE_TRENDING_TOOTS,
            loadingFxn: Storage.getToots.bind(Storage),
            serverFxn: (server) => server.fetchTrendingStatuses(),
            processingFxn: async (toots) => {
                setTrendingRankToAvg(toots);
                return await Toot.buildToots(toots, StorageKey.FEDIVERSE_TRENDING_TOOTS);
            },
        });
    };

    // Get the top trending links from all servers
    static async fediverseTrendingLinks(): Promise<TrendingLink[]> {
        return await this.fetchTrendingFromAllServers<TrendingLink>({
            key: StorageKey.FEDIVERSE_TRENDING_LINKS,
            serverFxn: (server) => server.fetchTrendingLinks(),
            processingFxn: async (links) => {
                return uniquifyTrendingObjs<TrendingLink>(links, link => link.url);
            }
        });
    };

    // Get the top trending tags from all servers
    static async fediverseTrendingTags(): Promise<TrendingTag[]> {
        return await this.fetchTrendingFromAllServers<TrendingTag>({
            key: StorageKey.FEDIVERSE_TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                const uniqueTags = uniquifyTrendingObjs<TrendingTag>(tags, tag => (tag as TrendingTag).name);
                return uniqueTags.slice(0, Storage.getConfig().numTrendingTags);
            }
        });
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getMastodonInstancesInfo(): Promise<MastodonInstances> {
        const logPrefix = `[${StorageKey.POPULAR_SERVERS}]`;
        const startedAt = new Date();
        const releaseMutex = await lockMutex(TRENDING_MUTEXES[StorageKey.POPULAR_SERVERS]!, logPrefix);

        try {
            let servers = await Storage.get(StorageKey.POPULAR_SERVERS) as MastodonInstances;

            if (servers && Object.keys(servers).length && !(await Storage.isDataStale(StorageKey.POPULAR_SERVERS))) {
                traceLog(`${logPrefix} Loaded ${Object.keys(servers).length} from cache ${ageString(startedAt)}`);
            } else {
                servers = await this.fetchMastodonInstances();
                console.log(`${logPrefix} Fetched ${Object.keys(servers).length} Instances ${ageString(startedAt)}:`, servers);
                await Storage.set(StorageKey.POPULAR_SERVERS, servers);
            }

            return servers;
        } finally {
            releaseMutex();
        }
    };

    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    private static async fetchMastodonInstances(): Promise<MastodonInstances> {
        const logPrefix = `[${StorageKey.POPULAR_SERVERS}] fetchMastodonServersInfo():`;
        traceLog(`${logPrefix} fetching ${StorageKey.POPULAR_SERVERS} info...`);
        const config = Storage.getConfig();

        // Find the servers which have the most accounts followed by the user to check for trends of interest
        const follows = await MastoApi.instance.getFollowedAccounts(); // TODO: this is a major bottleneck
        const followedUserDomainCounts = countValues<Account>(follows, account => account.homeserver());
        const mostFollowedDomains = sortKeysByValue(followedUserDomainCounts).slice(0, config.numServersToCheck);

        // Fetch Instance objects for the the Mastodon servers that have a lot of accounts followed by the
        // current Fedialgo. Filter out those below the userminServerMAU threshold
        let serverDict = await this.callForServers<InstanceResponse>(mostFollowedDomains, (s) => s.fetchServerInfo());
        serverDict = filterMinMAU(serverDict, config.minServerMAU);
        const numActiveServers = Object.keys(serverDict).length;
        const numServersToAdd = config.numServersToCheck - numActiveServers; // Number of default servers to add

        // If we have haven't found enough servers yet add some known popular servers from the preconfigured list.
        // TODO: if some of the default servers barf we won't top up the list again
        if (numServersToAdd > 0) {
            console.log(`${logPrefix} Only ${numActiveServers} servers w/min ${config.minServerMAU} MAU, adding some`);
            const extraServers = config.defaultServers.filter(s => !(s in serverDict)).slice(0, numServersToAdd);
            const extraServerInfos = await this.callForServers<InstanceResponse>(extraServers, (s) => s.fetchServerInfo());
            serverDict = {...serverDict, ...extraServerInfos};
        }

        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        return Object.entries(serverDict).reduce(
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
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    private static async getTopServerDomains(): Promise<string[]> {
        const servers = await this.getMastodonInstancesInfo();

        // Sort the servers by the number of users on each server
        const topServerDomains = Object.keys(servers).sort(
            (a, b) => servers[b].followedPctOfMAU! - servers[a].followedPctOfMAU!
        );

        console.debug(`[${StorageKey.POPULAR_SERVERS}] Top server domains:`, topServerDomains);
        return topServerDomains;
    };

    // Generic wrapper method to fetch trending data from all servers and process it into
    // an array of unique objects.
    private static async fetchTrendingFromAllServers<T>(props: FetchTrendingProps<T>): Promise<T[]> {
        const { key, processingFxn, serverFxn } = props;
        const loadingFxn = props.loadingFxn || Storage.get.bind(Storage);
        const logPrefix = `[${key}]`;
        const releaseMutex = await lockMutex(TRENDING_MUTEXES[key]!, logPrefix);
        const startedAt = new Date();

        try {
            const storageObjs = await loadingFxn(key) as T[];

            if (storageObjs?.length && !(await Storage.isDataStale(key))) {
                console.debug(`${logPrefix} Loaded ${storageObjs.length} cached records ${ageString(startedAt)}`);
                return storageObjs;
            } else {
                const serverObjs = await this.callForAllServers<T[]>(serverFxn);
                traceLog(`${logPrefix} result from all servers:`, serverObjs);
                const flatObjs = Object.values(serverObjs).flat();
                const uniqueObjs = await processingFxn(flatObjs);

                if (uniqueObjs.length && uniqueObjs[0] instanceof Toot) {
                    await Storage.storeToots(key, uniqueObjs as Toot[]);
                } else {
                    await Storage.set(key, uniqueObjs as StorableObj);
                }

                let msg = `[${TELEMETRY}] fetched ${uniqueObjs.length} unique records ${ageString(startedAt)}`;
                console.log(`${logPrefix} ${msg}`, uniqueObjs);
                return uniqueObjs;
            }
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
function filterMinMAU(
    serverInfos: Record<string, InstanceResponse>,
    minMAU: number
): Record<string, MastodonInstance> {
    const servers = Object.entries(serverInfos).reduce(
        (filtered, [domain, instanceObj]) => {
            if ((instanceObj?.usage?.users?.activeMonth || 0) >= minMAU) {
                filtered[domain] = instanceObj as MastodonInstance;
            }
            return filtered;
        },
        {} as Record<string, MastodonInstance>
    );

    traceLog(`[filterMinMAU()] ${Object.keys(servers).length} servers with MAU >= ${minMAU}:`, servers);
    return servers;
};
