"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../api");
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
async function coreServerFeature(followedAccounts) {
    // Count up what Mastodon servers the user follows live on
    const userServerCounts = followedAccounts.reduce((userCounts, follower) => {
        if (!follower.url)
            return userCounts;
        const server = follower.url.split("@")[0].split("https://")[1];
        userCounts[server] = (userCounts[server] || 0) + 1;
        return userCounts;
    }, {});
    const numServers = Object.keys(userServerCounts).length;
    if (numServers < NUM_SERVERS_TO_CHECK) {
        console.log(`Adding default servers bc user only follows accounts on ${numServers}:`, userServerCounts);
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
    const serverMAUs = {};
    const overrepresentedServerFrequ = {};
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
}
exports.default = coreServerFeature;
;
async function getMonthlyUsers(server) {
    try {
        const instance = await (0, api_1.mastodonFetch)(server, SERVER_MAU_ENDPOINT);
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    }
    catch (error) {
        console.warn(`Error fetching getMonthlyUsers() data for server ${server}:`, error);
        return 0; // Return 0 if we can't get the data
    }
}
;
//# sourceMappingURL=coreServerFeature.js.map