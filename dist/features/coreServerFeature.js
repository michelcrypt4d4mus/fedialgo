"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const NUM_SERVERS_TO_CHECK = 30;
const MAX_FOLLOWING_ACCOUNT_TO_PULL = 5000;
const SERVER_MAU_ENDPOINT = "api/v2/instance";
// Returns something called "overrepresentedServerFrequ"??
async function coreServerFeature(api, user) {
    const followedAccounts = await (0, helpers_1.mastodonFetchPages)(api.v1.accounts.$select(user.id).following.list, MAX_FOLLOWING_ACCOUNT_TO_PULL);
    console.debug(`followed users: `, followedAccounts);
    // Count up what Mastodon servers the user follows live on
    const userServerCounts = followedAccounts.reduce((userCounts, follower) => {
        if (!follower.url)
            return userCounts;
        const server = follower.url.split("@")[0].split("https://")[1];
        userCounts[server] = (userCounts[server] || 0) + 1;
        return userCounts;
    }, {});
    // Find the top NUM_SERVERS_TO_CHECK servers among accounts followed by the user.
    // These are the servers we will check for trending toots.
    console.debug(`coreServerFeature() userServerCounts: `, userServerCounts);
    const popularServers = Object.keys(userServerCounts)
        .sort((a, b) => userServerCounts[b] - userServerCounts[a])
        .slice(0, NUM_SERVERS_TO_CHECK);
    console.debug(`Top ${NUM_SERVERS_TO_CHECK} servers: `, popularServers);
    const monthlyUsers = await Promise.all(popularServers.map(server => {
        const serverMonthlyUsers = getMonthlyUsers(server);
        console.log(`Monthly users for ${server}: `, serverMonthlyUsers);
        return serverMonthlyUsers;
    }));
    // I guess this is looking to do something that compares active users vs. followed users
    // to maybe account for a lot of dead accounts or something?
    const overrepresentedServerFrequ = popularServers.reduce((acc, server, index) => {
        const activeUsers = monthlyUsers[index];
        if (activeUsers < 10)
            return acc;
        const ratio = userServerCounts[server] / activeUsers;
        return { ...acc, [server]: ratio };
    }, {});
    console.log(`overrepresentedServerFrequ: `, overrepresentedServerFrequ);
    return overrepresentedServerFrequ;
}
exports.default = coreServerFeature;
;
async function getMonthlyUsers(server) {
    try {
        const instance = await (0, helpers_1.mastodonFetch)(server, SERVER_MAU_ENDPOINT);
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