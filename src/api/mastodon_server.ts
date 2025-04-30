/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from "./objects/account";
import Storage from "../Storage";
import Toot from "./objects/toot";
import { ageInSeconds, toISOFormat } from "../helpers/time_helpers";
import { decorateHistoryScores, setTrendingRankToAvg, uniquifyTrendingObjs } from "./objects/trending_with_history";
import { INSTANCE, LINKS, STATUSES, TAGS, MastoApi } from "./api";
import { logAndThrowError } from "../helpers/string_helpers";
import { repairTag } from "./objects/tag";
import {
    atLeastValues,
    countValues,
    sortKeysByValue,
    transformKeys,
    zipPromises
} from "../helpers/collection_helpers";
import {
    MastodonServersInfo,
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

const TRENDING_MUTEXES: Record<string, Mutex> = {
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

    // Static helper methods for building URLs
    public static v1Url = (path: string) => `${API_V1}/${path}`;
    public static v2Url = (path: string) => `${API_V2}/${path}`;
    public static trendUrl = (path: string) => this.v1Url(`trends/${path}`);

    constructor(domain: string) {
        this.domain = domain;
    };

    // Fetch toots that are trending on this server
    // TODO: Important: Toots returned by this method have not had setDependentProps() called on them yet!
    async fetchTrendingToots(): Promise<Toot[]> {
        const toots = await this.fetchTrending<mastodon.v1.Status>(STATUSES);
        const trendingToots = toots.map(t => new Toot(t)).filter(t => t.popularity() > 0);

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

    // Get publicly available MAU information for this server.
    async fetchMonthlyUsers(): Promise<number> {
        if (Storage.getConfig().noMauServers.some(s => this.domain.startsWith(s))) {
            console.debug(`monthlyUsers() for '${this.domain}' is not available...`);
            return 0;
        }

        try {
            const instance = await this.fetch<mastodon.v2.Instance>(MastodonServer.v2Url(INSTANCE));
            return instance?.usage?.users?.activeMonth || 0;
        } catch (error) {
            console.warn(`Error in getMonthlyUsers() for server ${this.domain}`, error);
            return 0;
        }
    };

    // Fetch a list of objects of type T from a public API endpoint
    private async fetchTrending<T>(typeStr: string, limit?: number): Promise<T[]> {
        return this.fetchList<T>(MastodonServer.trendUrl(typeStr), limit);
    };

    // Fetch a list of objects of type T from a public API endpoint
    private async fetchList<T>(endpoint: string, limit?: number): Promise<T[]> {
        const label = endpoint.split("/").pop();
        let list: T[] = [];

        try {
            list = await this.fetch<T[]>(endpoint, limit);

            if (!list?.length) {
                logAndThrowError(`No ${label} found! list: ${JSON.stringify(list)}`);
            }
        } catch (e) {
            console.warn(`[fetchList] Failed to get data from '${this.domain}/${endpoint}! Response:`, e);
        }

        return list as T[];
    };

    // Get data from a public API endpoint on a Mastodon server.
    private async fetch<T>(endpoint: string, limit?: number): Promise<T> {
        const startTime = new Date();
        let urlEndpoint = `${this.domain}/${endpoint}`
        let url = `https://${urlEndpoint}`;
        if (limit) url += `?limit=${limit}`;
        console.debug(`[${urlEndpoint}] fetching at ${toISOFormat(startTime)}...`);
        const json = await axios.get<T>(url, { timeout: Storage.getConfig().timeoutMS });

        if (json.status === 200 && json.data) {
            console.debug(`[${urlEndpoint}] fetch response (${ageInSeconds(startTime)} seconds):`, json.data);
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
        const responses = await Promise.all([
            this.fediverseTrendingLinks(),
            this.fediverseTrendingTags(),
            this.fediverseTrendingToots(),
        ]);

        return {
            links: responses[0],
            tags: responses[1],
            toots: responses[2],
        };
    }

    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots(): Promise<Toot[]> {
        return await this.fetchTrendingFromAllServers<Toot>({
            key: StorageKey.FEDIVERSE_TRENDING_TOOTS,
            loadingFxn: Storage.getToots.bind(Storage),
            serverFxn: (server) => server.fetchTrendingToots(),
            processingFxn: async (toots) => {
                setTrendingRankToAvg(toots);
                await Toot.setDependentProps(toots);
                let uniqueToots = Toot.dedupeToots(toots, StorageKey.FEDIVERSE_TRENDING_TOOTS);
                uniqueToots = uniqueToots.sort((a, b) => b.popularity() - a.popularity());
                Storage.storeToots(StorageKey.FEDIVERSE_TRENDING_TOOTS, uniqueToots);
                return uniqueToots;
            },
        });
    };

    // Get the top trending links from all servers
    static async fediverseTrendingLinks(): Promise<TrendingLink[]> {
        return await this.fetchTrendingFromAllServers<TrendingLink>({
            key: StorageKey.FEDIVERSE_TRENDING_LINKS,
            serverFxn: (server) => server.fetchTrendingLinks(),
            processingFxn: async (links) => {
                const uniqueLinks = uniquifyTrendingObjs<TrendingLink>(links, obj => obj.url);
                await Storage.set(StorageKey.FEDIVERSE_TRENDING_LINKS, uniqueLinks);
                return uniqueLinks;
            }
        });
    };

    // Get the top trending tags from all servers
    static async fediverseTrendingTags(): Promise<TrendingTag[]> {
        return await this.fetchTrendingFromAllServers<TrendingTag>({
            key: StorageKey.FEDIVERSE_TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                let uniqueTags = uniquifyTrendingObjs<TrendingTag>(tags, obj => (obj as TrendingTag).name);
                uniqueTags = uniqueTags.slice(0, Storage.getConfig().numTrendingTags);
                await Storage.set(StorageKey.FEDIVERSE_TRENDING_TAGS, uniqueTags);
                return uniqueTags;
            }
        });
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getMastodonServersInfo(): Promise<MastodonServersInfo> {
        const releaseMutex = await TRENDING_MUTEXES[StorageKey.POPULAR_SERVERS].acquire()

        try {
            let servers = await Storage.get(StorageKey.POPULAR_SERVERS) as MastodonServersInfo;

            if (!servers || Object.keys(servers).length == 0 || (await Storage.isDataStale(StorageKey.POPULAR_SERVERS))) {
                servers = await this.fetchMastodonServersInfo();
                console.debug(`[${StorageKey.POPULAR_SERVERS}] retrieved mastodon server infos`, servers);
                await Storage.set(StorageKey.POPULAR_SERVERS, servers);
            } else {
                console.log(`[${StorageKey.POPULAR_SERVERS}] Loaded ${Object.keys(servers).length} from cache...`);
            }

            return servers;
        } finally {
            releaseMutex();
        }
    };

    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    private static async fetchMastodonServersInfo(): Promise<MastodonServersInfo> {
        console.debug(`[fetchMastodonServersInfo] fetching ${StorageKey.POPULAR_SERVERS} info...`);
        const config = Storage.getConfig();
        const follows = await MastoApi.instance.getFollowedAccounts(); // TODO: this is a major bottleneck

        // Find the top numServersToCheck servers among accounts followed by the user to check for trends.
        const followedServerUserCounts = countValues<Account>(follows, account => account.homeserver());
        const mostFollowedServers = sortKeysByValue(followedServerUserCounts).slice(0, config.numServersToCheck);
        let serverMAUs = await this.callForServers<number>(mostFollowedServers, (s) => s.fetchMonthlyUsers());

        const validServers = atLeastValues(serverMAUs, config.minServerMAU);
        const numValidServers = Object.keys(validServers).length;
        const numDefaultServers = config.numServersToCheck - numValidServers;
        console.debug(`followedServerUserCounts:`, followedServerUserCounts, `\nserverMAUs:`, serverMAUs);

        if (numDefaultServers > 0) {
            console.warn(`Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} user threshold`);
            const extraServers = config.defaultServers.filter(s => !serverMAUs[s]).slice(0, numDefaultServers);
            const extraServerMAUs = await this.callForServers<number>(extraServers, (s) => s.fetchMonthlyUsers());
            console.log(`Extra default server MAUs:`, extraServerMAUs);
            serverMAUs = { ...validServers, ...extraServerMAUs };
        }

        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        const mastodonServers = Object.keys(serverMAUs).reduce(
            (serverInfo, server) => {
                serverInfo[server] = {
                    domain: server,
                    followedPctOfMAU: 100 * (followedServerUserCounts[server] || 0) / serverMAUs[server],
                    serverMAU: serverMAUs[server],
                }

                return serverInfo;
            },
            {} as MastodonServersInfo
        );

        console.log(`Constructed MastodonServersInfo object:`, mastodonServers);
        return mastodonServers;
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    private static async getTopServerDomains(): Promise<string[]> {
        const servers = await this.getMastodonServersInfo();

        // Sort the servers by the number of users on each server
        const topServerDomains = Object.keys(servers).sort(
            (a, b) => servers[b].followedPctOfMAU - servers[a].followedPctOfMAU
        );

        console.debug(`[${StorageKey.POPULAR_SERVERS}] Top server domains:`, topServerDomains);
        return topServerDomains;
    };

    // Common wrapper method to fetch trending data from all servers and process it into
    // an array of unique objects.
    private static async fetchTrendingFromAllServers<T>(props: FetchTrendingProps<T>): Promise<T[]> {
        const { key, processingFxn, serverFxn } = props;
        const loadingFxn = props.loadingFxn || Storage.get.bind(Storage);
        const releaseMutex = await TRENDING_MUTEXES[key].acquire();
        const logPrefix = `[${key}]`;

        try {
            const storageObjs = await loadingFxn(key) as T[];

            if (storageObjs?.length && !(await Storage.isDataStale(key))) {
                console.log(`${logPrefix} using cached data with ${storageObjs.length} elements`);
                return storageObjs;
            } else {
                const serverObjs = await this.callForAllServers<T[]>(serverFxn);
                console.debug(`${logPrefix} from all servers:`, serverObjs);
                const flatObjs = Object.values(serverObjs).flat();
                const uniqueObjs = await processingFxn(flatObjs);
                console.info(`${logPrefix} fetched ${uniqueObjs.length} unique objs:`, uniqueObjs);
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
