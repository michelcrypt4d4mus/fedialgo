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
        const toots = await this.fetchList<mastodon.v1.Status>(MastoApi.trendUrl(STATUSES));
        const trendingToots = toots.map(t => new Toot(t)).filter(t => t.popularity() > 0);
        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => toot.trendingRank = 1 + (trendingToots?.length || 0) - i);
        return trendingToots;
    }

    // Get the links that are trending on this server
    async fetchTrendingLinks(): Promise<TrendingLink[]> {
        const trendingLinks = await this.fetchList<TrendingLink>(MastoApi.trendUrl(LINKS));
        trendingLinks.forEach(FeatureScorer.decorateHistoryScores);
        return trendingLinks;
    };

    // Get the tags that are trending on 'server'
    async fetchTrendingTags(numTags?: number): Promise<TrendingTag[]> {
        const tags = await this.fetchList<TrendingTag>(MastoApi.trendUrl(TAGS), numTags);
        tags.forEach(tag => FeatureScorer.decorateHistoryScores(repairTag(tag)));
        return tags;
    };

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

    // Fetch a list of objects of type T from a public API endpoint
    private async fetchList<T>(endpoint: string, limit?: number): Promise<T[]> {
        const label = endpoint.split("/").pop();
        let list: T[] = [];

        try {
            list = await this.fetch<T[]>(endpoint);

            if (!list?.length) {
                throw new Error(`No ${label} found! list: ${JSON.stringify(list)}`);
            }
        } catch (e) {
            console.warn(`[fetchList] Failed to get data from '${this.domain}/${endpoint}!`, e);
        }

        console.debug(`Retrieved ${list.length} of ${label} from '${this.domain}':`, list);
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
        console.log(`[TrendingToots] fetchTrendingToots() called`);
        // Pull top trending toots from each server
        let trendingTootses = await this.callForAllServers<Toot[]>((s) => s.fetchTrendingToots());
        let trendingToots = Object.values(trendingTootses).flat();
        setTrendingRankToAvg(trendingToots);
        return Toot.dedupeToots(trendingToots, "getTrendingToots");
    };

    static async fediverseTrendingLinks(): Promise<mastodon.v1.TrendLink[]> {
        let links = await this.callForAllServers<mastodon.v1.TrendLink[]>((s) => s.fetchTrendingLinks());
        console.log(`[TrendingLinks] links from all servers:`, links);
        const tagsByURL = groupBy<TrendingLink>(Object.values(links).flat(), link => link.url);
        return Object.values(links).flat();
    };

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
        console.debug(`validServers:`, validServers);

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
