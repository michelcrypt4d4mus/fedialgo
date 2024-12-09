/*
 * Methods for making calls to the publilcly available Mastodon API methods
 * that don't require authentication.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";

import Storage from "../Storage";
import { atLeastValues, countValues, zipPromises } from "../helpers";
import { decorateTrendingTag } from "./objects/tag";
import { extractServer } from "./objects/account";
import { MastoApi } from "./api";
import { StringNumberDict, TrendingTag } from "../types";
import { transformKeys } from "../helpers";;


// Returns something called "overrepresentedServerFrequ"??
export async function mastodonServersInfo(follows: mastodon.v1.Account[]): Promise<StringNumberDict> {
    // Tally what Mastodon servers the accounts that the user follows live on
    const followedServerUserCounts = countValues<mastodon.v1.Account>(follows, follow => extractServer(follow));
    const config = Storage.getConfig();
    console.debug(`mastodonServersInfo() userServerCounts: `, followedServerUserCounts);

    // Find the top numServersToCheck servers among accounts followed by the user.
    // These are the servers we will check for trending toots.
    const mostFollowedServers = Object.keys(followedServerUserCounts)
                                      .sort((a, b) => followedServerUserCounts[b] - followedServerUserCounts[a])
                                      .slice(0, config.numServersToCheck);

    let serverMAUs = await zipPromises<number>(mostFollowedServers, getMonthlyUsers);
    const validServers = atLeastValues(serverMAUs, config.minServerMAU);
    const numValidServers = Object.keys(validServers).length;
    const numDefaultServers = config.numServersToCheck - numValidServers;
    console.debug(`Most followed servers:`, mostFollowedServers, `\nserverMAUs:`, serverMAUs, `\nvalidServers:`, validServers);

    if (numDefaultServers > 0) {
        console.warn(`Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} threshold`);
        const extraServers = config.defaultServers.filter(s => !validServers[s]).slice(0, numDefaultServers);
        const extraServerMAUs = await zipPromises<number>(extraServers, getMonthlyUsers);
        console.log(`Got popular server MAUs:`, extraServerMAUs);
        serverMAUs = { ...validServers, ...extraServerMAUs };
    }

    const overrepresentedServerFrequ = Object.keys(serverMAUs).reduce((overRepped, server) => {
        overRepped[server] = (followedServerUserCounts[server] || 0) / serverMAUs[server];
        return overRepped;
    }, {} as StringNumberDict);

    console.log(`Final serverMAUs: `, serverMAUs);
    console.log(`Final overrepresentedServerFrequ: `, overrepresentedServerFrequ);
    return overrepresentedServerFrequ;
};


// Get the tags that are trending on 'server'
export async function fetchTrendingTags(server: string, numTags?: number): Promise<TrendingTag[]> {
    numTags ||= Storage.getConfig().numTrendingTootsPerServer;
    const tagsUrl = MastoApi.trendUrl("tags")
    let _tags: mastodon.v1.Tag[] | undefined;

    try {
        _tags = await mastodonFetch<mastodon.v1.Tag[]>(server, tagsUrl, numTags);
        if (!_tags || _tags.length == 0) throw new Error(`No tags found on '${server}'!`);
    } catch (e) {
        console.warn(`[TrendingTags] Failed to get trending toots from '${server}'!`, e);
        return [];
    }

    const tags = _tags.map(decorateTrendingTag);
    console.debug(`[TrendingTags] trendingTags for server '${server}':`, tags);
    return tags;
};


// Retrieve Mastodon server information from a given server's public (no auth) endpoint
export const mastodonFetch = async <T>(
    server: string,
    endpoint: string,
    limit?: number
): Promise<T | undefined> => {
    let url = `https://${server}/${endpoint}`;
    if (limit) url += `?limit=${limit}`;
    console.debug(`mastodonFetch() ${url}'...`);

    try {
        const json = await axios.get<T>(url);
        console.debug(`mastodonFetch() response for ${url}:`, json);

        if (json.status === 200 && json.data) {
            return transformKeys(json.data, camelCase);
        } else {
            throw json;
        }
    } catch (e) {
        console.warn(`Error fetching data for server ${server} from endpoint '${endpoint}'`, e);
        return;
    }
};


// Get publicly available MAU information. Requires no login (??)
async function getMonthlyUsers(server: string): Promise<number> {
    if (Storage.getConfig().noMauServers.some(s => server.startsWith(s))) {
        console.debug(`monthlyUsers() for '${server}' is not available`);
        return 0;
    }

    try {
        const instance = await mastodonFetch<mastodon.v2.Instance>(server, MastoApi.v2Url("instance"));
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    } catch (error) {
        console.warn(`Error in getMonthlyUsers() for server ${server}`, error);
        return 0;
    }
};
