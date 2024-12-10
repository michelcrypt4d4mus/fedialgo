/*
 * Methods for making calls to the publilcly available Mastodon API methods
 * that don't require authentication.
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


// Returns something called "overrepresentedServerFrequ"??
export async function mastodonServersInfo(): Promise<StringNumberDict> {
    const config = Storage.getConfig();
    const follows = await MastoApi.instance.fetchFollowedAccounts();

    // Find the top numServersToCheck servers among accounts followed by the user to check for trends.
    const followedServerUserCounts = countValues<mastodon.v1.Account>(follows, account => extractServer(account));
    const mostFollowedServers = sortKeysByValue(followedServerUserCounts).slice(0, config.numServersToCheck);
    console.debug(`mastodonServersInfo() userServerCounts: `, followedServerUserCounts);

    let serverMAUs = await zipPromises<number>(mostFollowedServers, getMonthlyUsers);
    const validServers = atLeastValues(serverMAUs, config.minServerMAU);
    const numValidServers = Object.keys(validServers).length;
    const numDefaultServers = config.numServersToCheck - numValidServers;
    console.debug(`Most followed servers:`, mostFollowedServers, `\nserverMAUs:`, serverMAUs, `\nvalidServers:`, validServers);

    if (numDefaultServers > 0) {
        console.warn(`Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} user threshold`);
        const extraServers = config.defaultServers.filter(s => !serverMAUs[s]).slice(0, numDefaultServers);
        const extraServerMAUs = await zipPromises<number>(extraServers, getMonthlyUsers);
        console.log(`Extra default server MAUs:`, extraServerMAUs);
        serverMAUs = { ...validServers, ...extraServerMAUs };
    }

    const overrepresentedServerFreq = Object.keys(serverMAUs).reduce((overRepped, server) => {
        overRepped[server] = (followedServerUserCounts[server] || 0) / serverMAUs[server];
        return overRepped;
    }, {} as StringNumberDict);

    console.log(`Final serverMAUs: `, serverMAUs);
    console.log(`Final overrepresentedServerFreq: `, overrepresentedServerFreq);
    return overrepresentedServerFreq;
};


// Get the tags that are trending on 'server'
export async function fetchTrendingTags(server: string, numTags?: number): Promise<TrendingTag[]> {
    numTags ||= Storage.getConfig().numTrendingTagsPerServer;
    const tagsUrl = MastoApi.trendUrl(TAGS);
    let tags: mastodon.v1.Tag[] | undefined;

    try {
        tags = await mastodonPublicFetch<mastodon.v1.Tag[]>(server, tagsUrl, numTags);
        if (!tags || tags.length == 0) throw new Error(`No tags found on '${server}'!`);
    } catch (e) {
        console.warn(`[TrendingTags] Failed to get trending toots from '${server}'!`, e);
        return [];
    }

    const trendingTags = tags.map(decorateTrendingTag);
    console.debug(`[TrendingTags] trendingTags for server '${server}':`, trendingTags);
    return trendingTags;
};


// Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
export async function fetchTrendingToots(): Promise<Toot[]> {
    console.log(`[TrendingToots] getTrendingToots() called`);
    const topServerDomains = await MastoApi.instance.getTopServerDomains();

    // Pull top trending toots from each server
    let trendingTootses: Toot[][] = await Promise.all(
        topServerDomains.map(async (server: string): Promise<Toot[]> => {
            let topToots: Toot[] | undefined = [];

            try {
                topToots = await mastodonPublicFetch<Toot[]>(server, MastoApi.trendUrl(STATUSES));
                if (!topToots?.length) throw new Error(`Failed to get topToots: ${JSON.stringify(topToots)}`);
                topToots = topToots.map(t => new Toot(t));
            } catch (e) {
                console.warn(`Error fetching trending toots from '${server}':`, e);
                return [];
            }

            // Inject toots with at least one favorite of retoot with a trendingRank score that is reverse-ordered.
            // e.g most popular trending toot gets numTrendingTootsPerServer points, least trending gets 1).
            topToots = topToots.filter(toot => toot.popularity() > 0);
            topToots.forEach((toot, i) => toot.trendingRank = 1 + (topToots?.length || 0) - i);
            console.debug(`trendingToots for '${server}': `, topToots.map(t => t.condensedStatus()));
            return topToots;
        })
    );

    const trendingToots = setTrendingRankToAvg(trendingTootses.flat());
    return Toot.dedupeToots(trendingToots, "getTrendingToots");
};


// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
function setTrendingRankToAvg(rankedToots: Toot[]): Toot[] {
    const tootsTrendingOnMultipleServers = groupBy<Toot>(rankedToots, (toot) => toot.uri);

    Object.entries(tootsTrendingOnMultipleServers).forEach(([_uri, toots]) => {
        const avgScore = average(toots.map(t => t.trendingRank) as number[]);
        toots.forEach(toot => toot.trendingRank = avgScore);
    });

    return rankedToots;
};


// Get publicly available MAU information. Requires no login (??)
async function getMonthlyUsers(server: string): Promise<number> {
    if (Storage.getConfig().noMauServers.some(s => server.startsWith(s))) {
        console.debug(`monthlyUsers() for '${server}' is not available, skipping...`);
        return 0;
    }

    try {
        const instance = await mastodonPublicFetch<mastodon.v2.Instance>(server, MastoApi.v2Url(INSTANCE));
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    } catch (error) {
        console.warn(`Error in getMonthlyUsers() for server ${server}`, error);
        return 0;
    }
};


// Get data from a public API endpoint on a Mastodon server.
async function mastodonPublicFetch<T>(
    server: string,
    endpoint: string,
    limit?: number
): Promise<T | undefined> {
    let url = `https://${server}/${endpoint}`;
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
