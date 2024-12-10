/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";

import Storage from "../Storage";
import Toot from "./objects/toot";
import { atLeastValues, average, countValues, groupBy, sortKeysByValue, zipPromises } from "../helpers";
import { decorateTrendingTag } from "./objects/tag";
import { extractServer } from "./objects/account";
import { INSTANCE, STATUSES, TAGS, MastoApi } from "./api";
import { StringNumberDict, TrendingTag } from "../types";
import { transformKeys } from "../helpers";


export default class MastodonServer {
    domain: string;

    constructor(domain: string) {
        this.domain = domain;
    };

    // Get the tags that are trending on 'server'
    async fetchTrendingTags(numTags?: number): Promise<TrendingTag[]> {
        numTags ||= Storage.getConfig().numTrendingTagsPerServer;
        const tagsUrl = MastoApi.trendUrl(TAGS);
        let tags: mastodon.v1.Tag[] | undefined;

        try {
            tags = await this.fetch<mastodon.v1.Tag[]>(tagsUrl, numTags);
            if (!tags || tags.length == 0) throw new Error(`No tags found on '${this.domain}'!`);
        } catch (e) {
            console.warn(`[TrendingTags] Failed to get trending toots from '${this.domain}'!`, e);
            return [];
        }

        const trendingTags = tags.map(decorateTrendingTag);
        console.debug(`[TrendingTags] trendingTags for server '${this.domain}':`, trendingTags);
        return trendingTags;
    };

    // Fetch toots that are trending on this server
    async fetchTrendingToots(): Promise<Toot[]> {
        let topToots: Toot[] | undefined = [];

        try {
            topToots = await this.fetch<Toot[]>(MastoApi.trendUrl(STATUSES));
            if (!topToots?.length) throw new Error(`Failed to get topToots, got: ${JSON.stringify(topToots)}`);
            topToots = topToots.map(t => new Toot(t));
        } catch (e) {
            console.warn(`Error fetching trending toots from '${this.domain}':`, e);
            return [];
        }

        topToots = topToots.filter(toot => toot.popularity() > 0);
        let filteredToots = topToots.filter(toot => toot.popularity() > 0);
        console.debug(`trendingToots() Removed ${topToots.length - filteredToots.length} toots with no favorites or retoots`);

        // Inject toots with at least one favorite of retoot with a trendingRank score that is reverse-ordered.
        // e.g most popular trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        filteredToots.forEach((toot, i) => toot.trendingRank = 1 + (filteredToots?.length || 0) - i);
        console.debug(`trendingToots for '${this.domain}': `, filteredToots.map(t => t.condensedStatus()));
        return filteredToots ?? [];
    }

    // Get publicly available MAU information for this server.
    async fetchMonthlyUsers(): Promise<number> {
        if (Storage.getConfig().noMauServers.some(s => this.domain.startsWith(s))) {
            console.debug(`monthlyUsers() for '${this.domain}' is not available, skipping...`);
            return 0;
        }

        try {
            const instance = await this.fetch<mastodon.v2.Instance>(MastoApi.v2Url(INSTANCE));
            console.debug(`monthlyUsers() for '${this.domain}', 'instance' var: `, instance);
            return instance ? instance.usage.users.activeMonth : 0;
        } catch (error) {
            console.warn(`Error in getMonthlyUsers() for server ${this.domain}`, error);
            return 0;
        }
    };

    // Get data from a public API endpoint on a Mastodon server.
    private async fetch<T>(endpoint: string, limit?: number): Promise<T | undefined> {
        let url = `https://${this.domain}/${endpoint}`;
        if (limit) url += `?limit=${limit}`;
        console.debug(`mastodonFetch() URL: '${url}'`);

        try {
            const json = await axios.get<T>(url);
            console.debug(`mastodonFetch() response for '${url}':`, json);

            if (json.status === 200 && json.data) {
                return transformKeys(json.data, camelCase);
            } else {
                throw json;
            }
        } catch (e) {
            console.warn(`Error fetching data from '${url}'`, e);
            return;
        }
    };

    ////////////////////
    // Static Methods //
    ////////////////////

    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots(): Promise<Toot[]> {
        console.log(`[TrendingToots] fetchTrendingToots() called`);
        // Pull top trending toots from each server
        let trendingTootses = await this.callForAllServers<Toot[]>((server) => server.fetchTrendingToots());
        let trendingToots = Object.values(trendingTootses).flat();
        setTrendingRankToAvg(trendingToots);
        return Toot.dedupeToots(trendingToots, "getTrendingToots");
    };

    // Returns something called "overrepresentedServerFrequ"??
    static async mastodonServersInfo(): Promise<StringNumberDict> {
        const config = Storage.getConfig();
        const follows = await MastoApi.instance.fetchFollowedAccounts();

        // Find the top numServersToCheck servers among accounts followed by the user to check for trends.
        const followedServerUserCounts = countValues<mastodon.v1.Account>(follows, account => extractServer(account));
        const mostFollowedServers = sortKeysByValue(followedServerUserCounts).slice(0, config.numServersToCheck);
        console.debug(`mastodonServersInfo() userServerCounts: `, followedServerUserCounts);
        let serverMAUs = await this.callForServers<number>(mostFollowedServers, (server) => server.fetchMonthlyUsers());
        console.log(`mastodonServersInfo() serverMAUs: `, serverMAUs);

        const validServers = atLeastValues(serverMAUs, config.minServerMAU);
        const numValidServers = Object.keys(validServers).length;
        const numDefaultServers = config.numServersToCheck - numValidServers;
        console.debug(`Most followed servers:`, mostFollowedServers, `\nserverMAUs:`, serverMAUs, `\nvalidServers:`, validServers);

        if (numDefaultServers > 0) {
            console.warn(`Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} user threshold`);
            const extraServers = config.defaultServers.filter(s => !serverMAUs[s]).slice(0, numDefaultServers);
            const extraServerMAUs = await this.callForServers<number>(extraServers, (server) => server.fetchMonthlyUsers());
            console.log(`Extra default server MAUs:`, extraServerMAUs);
            serverMAUs = { ...validServers, ...extraServerMAUs };
        }

        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        const overrepresentedServerFreq = Object.keys(serverMAUs).reduce((overRepped, server) => {
            overRepped[server] = (followedServerUserCounts[server] || 0) / serverMAUs[server];
            return overRepped;
        }, {} as StringNumberDict);

        console.log(`Final serverMAUs: `, serverMAUs);
        console.log(`Final overrepresentedServerFreq: `, overrepresentedServerFreq);
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
