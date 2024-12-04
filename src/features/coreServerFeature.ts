/*
 * Handles getting accounts followed by the fedialgo user and also things like monthly
 * active users about the various servers in the Fediverse.
 */
import { mastodon } from "masto";

import { mastodonFetch, mastodonFetchPages } from "../api";
import { AccountNames, StringNumberDict } from "../types";
import { ServerFeature } from "../types";

const NUM_SERVERS_TO_CHECK = 30;
const SERVER_MAU_ENDPOINT = "api/v2/instance";
const MINIMUM_MAU = 100;

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
    "mastodonapp.uk",
    "infosec.exchange",
    "mastodon.technology",
    "ioc.exchange",
    "mastodon.art",
    "techhub.social",
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


// Returns something called "overrepresentedServerFrequ"??
export default async function coreServerFeature(followedAccounts: AccountNames): Promise<ServerFeature> {
    // Count up what Mastodon servers the user follows live on
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

    if (numServers < NUM_SERVERS_TO_CHECK) {
        console.log(`Adding default servers bc user only follows accts on ${numServers} servers:`, userServerCounts);

        POPULAR_SERVERS.filter(s => !userServerCounts[s])
                       .slice(0, NUM_SERVERS_TO_CHECK - numServers)
                       .forEach(s => (userServerCounts[s] = 1));
    }

    // Find the top NUM_SERVERS_TO_CHECK servers among accounts followed by the user.
    // These are the servers we will check for trending toots.
    const popularServers = Object.keys(userServerCounts)
                                 .sort((a, b) => userServerCounts[b] - userServerCounts[a])
                                 .slice(0, NUM_SERVERS_TO_CHECK);

    console.debug(`coreServerFeature() userServerCounts: `, userServerCounts);
    console.debug(`Top ${NUM_SERVERS_TO_CHECK} servers: `, popularServers);
    const monthlyUsers = await Promise.all(popularServers.map(s => getMonthlyUsers(s)));
    const serverMAUs: StringNumberDict = {};
    const overrepresentedServerFrequ: StringNumberDict = {};

    popularServers.forEach((server, i) => {
        if (monthlyUsers[i] < MINIMUM_MAU) {
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


async function getMonthlyUsers(server: string): Promise<number> {
    try {
        const instance = await mastodonFetch<mastodon.v2.Instance>(server, SERVER_MAU_ENDPOINT);
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    } catch (error) {
        console.warn(`Error fetching getMonthlyUsers() data for server ${server}:`, error);
        return 0; // Return 0 if we can't get the data
    }
};
