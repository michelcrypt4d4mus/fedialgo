/*
 * Handles getting Fediverse server metadata like monthly active users.
 */
import { mastodon } from "masto";

import Storage from "../Storage";
import { getMonthlyUsers } from "../api/api";
import { AccountNames, ServerFeature, StringNumberDict } from "../types";

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
export default async function mastodonServersInfo(
    _api: mastodon.rest.Client,
    _user: mastodon.v1.Account,
    followedAccounts: AccountNames
): Promise<ServerFeature> {
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
