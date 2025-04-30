/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from "./objects/account";
import FeatureScorer from "../scorer/feature_scorer";
import Storage from "../Storage";
import Toot from "./objects/toot";
import { ageInSeconds } from "../helpers/time_helpers";
import { INSTANCE, LINKS, STATUSES, TAGS, MastoApi } from "./api";
import { MastodonServersInfo, StorageKey, TrendingLink, TrendingStorage, TrendingTag } from "../types";
import { repairTag } from "./objects/tag";
import {
    atLeastValues,
    average,
    countValues,
    groupBy,
    sortKeysByValue,
    transformKeys,
    zipPromises
} from "../helpers/collection_helpers";

export enum FediverseTrendingType {
    STATUSES = "statuses",
    LINKS = "links",
    TAGS = "tags",
};

const trendingMutexes: Record<string, Mutex> = {
    [StorageKey.FEDIVERSE_TRENDING_LINKS]: new Mutex(),
    [StorageKey.FEDIVERSE_TRENDING_TAGS]: new Mutex(),
    [StorageKey.FEDIVERSE_TRENDING_TOOTS]: new Mutex(),
};


export default class MastodonServer {
    domain: string;

    constructor(domain: string) {
        this.domain = domain;
    };

    // Fetch toots that are trending on this server
    async fetchTrendingToots(): Promise<Toot[]> {
        const toots = await this.fetchTrending<mastodon.v1.Status>(STATUSES);
        const trendingToots = toots.map(t => new Toot(t)).filter(t => t.popularity() > 0);

        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => {
            toot.trendingRank = 1 + (trendingToots?.length || 0) - i;
            if (toot.reblog) toot.trendingRank = toot.trendingRank;
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
        trendingLinks.forEach(FeatureScorer.decorateHistoryScores);
        return trendingLinks;
    };

    // Get the tags that are trending on 'server'
    async fetchTrendingTags(): Promise<TrendingTag[]> {
        const numTags = Storage.getConfig().numTrendingTagsPerServer;
        const trendingTags = await this.fetchTrending<TrendingTag>(TAGS, numTags);
        trendingTags.forEach(tag => FeatureScorer.decorateHistoryScores(repairTag(tag)));
        return trendingTags;
    };

    // Get publicly available MAU information for this server.
    async fetchMonthlyUsers(): Promise<number> {
        if (Storage.getConfig().noMauServers.some(s => this.domain.startsWith(s))) {
            console.debug(`monthlyUsers() for '${this.domain}' is not available...`);
            return 0;
        }

        try {
            const instance = await this.fetch<mastodon.v2.Instance>(MastoApi.v2Url(INSTANCE));
            return instance?.usage?.users?.activeMonth || 0;
        } catch (error) {
            console.warn(`Error in getMonthlyUsers() for server ${this.domain}`, error);
            return 0;
        }
    };

    // Fetch a list of objects of type T from a public API endpoint
    private async fetchTrending<T>(typeStr: string, limit?: number): Promise<T[]> {
        return this.fetchList<T>(MastoApi.trendUrl(typeStr), limit);
    };

    // Fetch a list of objects of type T from a public API endpoint
    private async fetchList<T>(endpoint: string, limit?: number): Promise<T[]> {
        const label = endpoint.split("/").pop();
        let list: T[] = [];

        try {
            list = await this.fetch<T[]>(endpoint, limit);

            if (!list?.length) {
                throw new Error(`No ${label} found! list: ${JSON.stringify(list)}`);
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
        console.debug(`[${urlEndpoint}] fetching at ${startTime}...`);
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
        const releaseMutex = await trendingMutexes[StorageKey.FEDIVERSE_TRENDING_TOOTS].acquire();

        try {
            const storageToots = await Storage.getToots(StorageKey.FEDIVERSE_TRENDING_TOOTS);

            if (storageToots && !(await Storage.isDataStale())) {
                console.debug(`[fediverseTrendingToots] using cached trending toots:`, storageToots);
                return storageToots;
            } else {
                const trendingTootses = await this.callForAllServers<Toot[]>(s => s.fetchTrendingToots());
                let trendingToots = Object.values(trendingTootses).flat();
                setTrendingRankToAvg(trendingToots);
                trendingToots = Toot.dedupeToots(trendingToots, "fediverseTrendingToots");
                await Storage.storeToots(StorageKey.FEDIVERSE_TRENDING_TOOTS, trendingToots);
                console.log(`[fediverseTrendingToots] fetched trending toots:`, trendingToots);
                return trendingToots;
            }
        } finally {
            releaseMutex();
        }
    };

    // Get the top trending links from all servers
    static async fediverseTrendingLinks(): Promise<TrendingLink[]> {
        const releaseMutex = await trendingMutexes[StorageKey.FEDIVERSE_TRENDING_LINKS].acquire();

        try {
            const storageLinks = await Storage.get(StorageKey.FEDIVERSE_TRENDING_LINKS);

            if (storageLinks && !(await Storage.isDataStale())) {
                console.debug(`[fediverseTrendingLinks] using cached trending links:`, storageLinks);
                return storageLinks as TrendingLink[];
            } else {
                const serverLinks = await this.callForAllServers<TrendingLink[]>(s => s.fetchTrendingLinks());
                console.debug(`[fediverseTrendingLinks] Links from all servers:`, serverLinks);
                const links = FeatureScorer.uniquifyTrendingObjs(Object.values(serverLinks).flat(), link => link.url);
                console.info(`[fediverseTrendingLinks] Found ${links.length} unique trending links`);
                await Storage.set(StorageKey.FEDIVERSE_TRENDING_LINKS, links as TrendingLink[]);
                return links as TrendingLink[];
            }
        } finally {
            releaseMutex();
        }
    };

    // Get the top trending tags from all servers
    static async fediverseTrendingTags(): Promise<TrendingTag[]> {
        const releaseMutex = await trendingMutexes[StorageKey.FEDIVERSE_TRENDING_TAGS].acquire();

        try {
            const storageTags = await Storage.get(StorageKey.FEDIVERSE_TRENDING_TAGS);

            if (storageTags && !(await Storage.isDataStale())) {
                console.debug(`[fediverseTrendingLinks] using cached trending tags:`, storageTags);
                return storageTags as TrendingTag[];
            } else {
                const serverTags = await this.callForAllServers<TrendingTag[]>(s => s.fetchTrendingTags());
                console.debug(`[fediverseTrendingTags] tags from all servers:`, serverTags);
                const allTags = Object.values(serverTags).flat();
                const tags = FeatureScorer.uniquifyTrendingObjs(allTags, tag => (tag as TrendingTag).name);
                console.info(`[fediverseTrendingTags] fetched unique tags:`, tags);
                let returnTags = tags.slice(0, Storage.getConfig().numTrendingTags) as TrendingTag[];
                await Storage.set(StorageKey.FEDIVERSE_TRENDING_TAGS, returnTags);
                return returnTags;
            }
        } finally {
            releaseMutex();
        }
    }

    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    static async mastodonServersInfo(): Promise<MastodonServersInfo> {
        console.debug(`[mastodonServersInfo] fetching remote server info...`);
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
    };

    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    private static async callForAllServers<T>(
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        const domains = await MastoApi.instance.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    };

    // Call 'fxn' for a list of domains and return a dict keyed by domain
    private static async callForServers<T>(
        domains: string[],
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        return await zipPromises<T>(domains, async (domain) => fxn(new MastodonServer(domain)));
    };
};


// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
function setTrendingRankToAvg(rankedToots: Toot[]): void {
    const tootsTrendingOnMultipleServers = groupBy<Toot>(rankedToots, toot => toot.uri);

    Object.entries(tootsTrendingOnMultipleServers).forEach(([_uri, toots]) => {
        const avgScore = average(toots.map(t => t.reblog?.trendingRank || t.trendingRank) as number[]);

        toots.forEach((toot) => {
            toot.trendingRank = avgScore;
            if (toot.reblog) {
                toot.reblog.trendingRank = avgScore;
                console.log(`[setTrendingRankToAvg] for reblog to ${avgScore}:`, toot);
            }
        });
    });
};
