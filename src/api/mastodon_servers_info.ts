/*
 * Methods for making calls to the publilcly available Mastodon API methods
 * that don't require authentication.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";

import Storage from "../Storage";
import { AccountNames, ServerFeature, StringNumberDict, TrendingTag } from "../types";
import { decorateTrendingTag } from "./objects/tag";
import { MastoApi } from "./api";
import { transformKeys } from "../helpers";

// Popular servers are usually culled from the users' following list but if there aren't
// enough of them to get good trending data fill the list out with these.
// Culled from https://mastodonservers.net and https://joinmastodon.org/
const _POPULAR_SERVERS = [
    "mastodon.social",
    // "pawoo.net",   // Japanese (and maybe NSFW?)
    // "baraag.net",  // very NSFW
    // "mstdn.jp",    // Japanese
    "mastodon.cloud",
    // "pravda.me"    // Russian
    "mstdn.social",
    "mastodon.online",
    "mas.to",
    "mastodon.world",
    "mastodon.lol",
    "c.im",
    "hachyderm.io",
    "fosstodon.org",
    "universeodon.com",
    "infosec.exchange",
    "mastodon.gamedev.place",
    "mastodonapp.uk",
    "mastodon.technology",
    "ioc.exchange",
    "mastodon.art",
    "techhub.social",
    "mathstodon.xyz",
    "mastodon.sdf.org",
    "defcon.social",
    "mstdn.party",
    "sfba.social",
    "toot.community",
    "ravenation.club",
    "sciences.social",
    "toot.io",
];

const POPULAR_SERVERS = _POPULAR_SERVERS.map(s => `${s}/`);
const POPULAR_SRERVERS_MAU_GUESS = 1000;


// Returns something called "overrepresentedServerFrequ"??
export default async function mastodonServersInfo(followedAccounts: AccountNames): Promise<ServerFeature> {
    const numServersToCheck = Storage.getConfig().numServersToCheck;

    // Tally what Mastodon servers the accounts that the user follows live on
    const userServerCounts = Object.values(followedAccounts).reduce(
        (userCounts: ServerFeature, follower: mastodon.v1.Account) => {
            if (!follower.url) return userCounts;
            const server = follower.url.split("@")[0].split("https://")[1];
            userCounts[server] = (userCounts[server] || 0) + 1;
            return userCounts;
        },
        {}
    );

    const numServers = Object.keys(userServerCounts).length;

    if (numServers < numServersToCheck) {
        POPULAR_SERVERS.filter(s => !userServerCounts[s])
                       .slice(0, numServersToCheck - numServers)
                       .forEach(s => (userServerCounts[s] = POPULAR_SRERVERS_MAU_GUESS));

        console.log(
            `User only follows accounts on ${numServers} servers so added some default servers:`,
            userServerCounts
        );
    }

    // Find the top numServersToCheck servers among accounts followed by the user.
    // These are the servers we will check for trending toots.
    const popularServers = Object.keys(userServerCounts)
                                 .sort((a, b) => userServerCounts[b] - userServerCounts[a])
                                 .slice(0, numServersToCheck);

    console.debug(`mastodonServersInfo() userServerCounts: `, userServerCounts);
    console.debug(`Top ${numServersToCheck} servers: `, popularServers);
    const monthlyUsers = await Promise.all(popularServers.map(s => getMonthlyUsers(s)));
    const serverMAUs: StringNumberDict = {};
    const overrepresentedServerFrequ: StringNumberDict = {};

    popularServers.forEach((server, i) => {
        if (monthlyUsers[i] < Storage.getConfig().minServerMAU) {
            console.log(`Ignoring server '${server}' with only ${monthlyUsers[i]} MAU...`);
            return;
        }

        // I guess this is looking to do something that compares active users vs. followed users
        // to maybe account for a lot of dead accounts or something?
        overrepresentedServerFrequ[server] = userServerCounts[server] / monthlyUsers[i];
        serverMAUs[server] = monthlyUsers[i];
    });

    console.log(`serverMAUs: `, serverMAUs);
    console.log(`overrepresentedServerFrequ: `, overrepresentedServerFrequ);
    return overrepresentedServerFrequ;
};


// Get publicly available MAU information. Requires no login (??)
export async function getMonthlyUsers(server: string): Promise<number> {
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
    let url = `https://${server}${endpoint}`;
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
