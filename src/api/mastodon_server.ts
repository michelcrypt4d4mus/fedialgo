/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";

import FeatureScorer from "../scorer/feature_scorer";
import Storage from "../Storage";
import Toot from "./objects/toot";
import { atLeastValues, average, countValues, groupBy, sortKeysByValue, transformKeys, zipPromises } from "../helpers";
import { extractServer } from "./objects/account";
import { INSTANCE, LINKS, STATUSES, TAGS, MastoApi } from "./api";
import { repairTag } from "./objects/tag";
import { StringNumberDict, TrendingLink, TrendingTag } from "../types";


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
        trendingToots.forEach((toot, i) => toot.trendingRank = 1 + (trendingToots?.length || 0) - i);
        console.log(`[fetchTrendingToots] trendingToots for '${this.domain}':`, trendingToots);
        return trendingToots;
    }

    // Get the links that are trending on this server
    async fetchTrendingLinks(): Promise<TrendingLink[]> {
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
            console.warn(`[fetchList] Failed to get data from '${this.domain}/${endpoint}!`, e);
        }

        console.info(`Retrieved ${list.length} trending ${label} from '${this.domain}':`, list);
        return list as T[];
    };

    // Get data from a public API endpoint on a Mastodon server.
    private async fetch<T>(endpoint: string, limit?: number): Promise<T> {
        let url = `https://${this.domain}/${endpoint}`;
        if (limit) url += `?limit=${limit}`;
        const json = await axios.get<T>(url);
        console.debug(`mastodonFetch() response for '${url}':`, json);

        if (json.status === 200 && json.data) {
            return transformKeys(json.data, camelCase) as T;
        } else {
            throw json;
        }
    };

    ////////////////////
    // Static Methods //
    ////////////////////

    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots(): Promise<Toot[]> {
        let trendingTootses = await this.callForAllServers<Toot[]>((s) => s.fetchTrendingToots());
        let trendingToots = Object.values(trendingTootses).flat();
        setTrendingRankToAvg(trendingToots);
        return Toot.dedupeToots(trendingToots, "fediverseTrendingToots");
    };

    static async fediverseTrendingLinks(): Promise<TrendingLink[]> {
        const serverLinks = await this.callForAllServers<TrendingLink[]>(s => s.fetchTrendingLinks());
        console.info(`[fediverseTrendingLinks] links from all servers:`, serverLinks);
        const links = FeatureScorer.uniquifyTrendingObjs(Object.values(serverLinks).flat(), link => link.url);
        console.info(`[fediverseTrendingLinks] unique links:`, links);
        return links as TrendingLink[];
    };

    // Get the top trending tags from all servers
    static async fediverseTrendingTags(): Promise<TrendingTag[]> {
        const serverTags = await this.callForAllServers<TrendingTag[]>(s => s.fetchTrendingTags());
        console.info(`[fediverseTrendingTags] tags from all servers:`, serverTags);
        const tags = FeatureScorer.uniquifyTrendingObjs(Object.values(serverTags).flat(), tag => (tag as TrendingTag).name);
        console.info(`[fediverseTrendingTags] unique tags:`, tags);
        return tags.slice(0, Storage.getConfig().numTrendingTags) as TrendingTag[];
    }

    // Returns something called "overrepresentedServerFrequ"??
    static async mastodonServersInfo(): Promise<StringNumberDict> {
        const config = Storage.getConfig();
        const follows = await MastoApi.instance.fetchFollowedAccounts();

        // Find the top numServersToCheck servers among accounts followed by the user to check for trends.
        const followedServerUserCounts = countValues<mastodon.v1.Account>(follows, account => extractServer(account));
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
        const overrepresentedServerFreq = Object.keys(serverMAUs).reduce((overRepped, server) => {
            overRepped[server] = (followedServerUserCounts[server] || 0) / serverMAUs[server];
            return overRepped;
        }, {} as StringNumberDict);

        console.log(`Final serverMAUs: `, serverMAUs, `\noverrepresentedServerFreq:`, overrepresentedServerFreq);
        return overrepresentedServerFreq;
    };

    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    static async callForAllServers<T>(
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        const domains = await MastoApi.instance.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    };

    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    static async callForServers<T>(
        domains: string[],
        fxn: (server: MastodonServer) => Promise<T>
    ): Promise<Record<string, T>> {
        return await zipPromises<T>(domains, async (domain) => fxn(new MastodonServer(domain)));
    };
};


// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
function setTrendingRankToAvg(rankedToots: Toot[]): void {
    const tootsTrendingOnMultipleServers = groupBy<Toot>(rankedToots, (toot) => toot.uri);

    Object.entries(tootsTrendingOnMultipleServers).forEach(([_uri, toots]) => {
        const avgScore = average(toots.map(t => t.trendingRank) as number[]);
        toots.forEach(toot => toot.trendingRank = avgScore);
    });
};
