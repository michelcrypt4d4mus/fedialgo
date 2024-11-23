"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const NUM_SERVERS_TO_CHECK = 30;
const NUM_SERVERS_TO_RETURN = 20;
const SERVER_RECORDS_TO_PULL = 80;
const NUM_SERVER_PAGES_TO_PULL = 10;
async function coreServerFeature(api, user) {
    let results = await (0, helpers_1.mastodonFetchPages)(api.v1.accounts.$select(user.id).following.list, NUM_SERVER_PAGES_TO_PULL, SERVER_RECORDS_TO_PULL);
    console.log(`coreServerFeature() results pulled with mastodonFetchPages(): `, results);
    const serverFrequ = results.reduce((accumulator, follower) => {
        const server = follower.url.split("@")[0].split("https://")[1];
        if (server in accumulator) {
            accumulator[server] += 1;
        }
        else {
            accumulator[server] = 1;
        }
        return accumulator;
    }, {});
    console.debug(`coreServerFeature() serverFrequ: `, serverFrequ);
    const popularServers = Object.keys(serverFrequ)
        .sort((a, b) => serverFrequ[b] - serverFrequ[a])
        .slice(0, NUM_SERVERS_TO_CHECK);
    console.debug(`Top ${NUM_SERVERS_TO_CHECK} servers: `, popularServers);
    const monthlyUsers = await Promise.all(popularServers.map(server => {
        const serverMonthlyUsers = getMonthlyUsers(server);
        console.log(`Monthly users for ${server}: `, serverMonthlyUsers);
        return serverMonthlyUsers;
    }));
    const overrepresentedServerFrequ = popularServers.reduce((acc, server, index) => {
        const activeUsers = monthlyUsers[index];
        if (activeUsers < 10)
            return acc;
        const ratio = serverFrequ[server] / activeUsers;
        return { ...acc, [server]: ratio };
    }, {});
    console.log(`overrepresentedServerFrequ: `, overrepresentedServerFrequ);
    return overrepresentedServerFrequ;
}
exports.default = coreServerFeature;
;
async function getMonthlyUsers(server) {
    try {
        const instance = await (0, helpers_1.mastodonFetch)(server, "api/v2/instance");
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    }
    catch (error) {
        console.warn(`Error fetching data for server ${server}:`, error);
        return 0; // Return 0 if we can't get the data
    }
}
;
//# sourceMappingURL=coreServerFeature.js.map