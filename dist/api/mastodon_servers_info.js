"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTrendingTags = exports.getMonthlyUsers = void 0;
const Storage_1 = __importDefault(require("../Storage"));
const tag_1 = require("./objects/tag");
const api_1 = require("./api");
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
async function mastodonServersInfo(_api, _user, followedAccounts) {
    const numServersToCheck = Storage_1.default.getConfig().numServersToCheck;
    // Tally what Mastodon servers the accounts that the user follows live on
    const userServerCounts = Object.values(followedAccounts).reduce((userCounts, follower) => {
        if (!follower.url)
            return userCounts;
        const server = follower.url.split("@")[0].split("https://")[1];
        userCounts[server] = (userCounts[server] || 0) + 1;
        return userCounts;
    }, {});
    const numServers = Object.keys(userServerCounts).length;
    if (numServers < numServersToCheck) {
        POPULAR_SERVERS.filter(s => !userServerCounts[s])
            .slice(0, numServersToCheck - numServers)
            .forEach(s => (userServerCounts[s] = POPULAR_SRERVERS_MAU_GUESS));
        console.log(`User only follows accounts on ${numServers} servers so added some default servers:`, userServerCounts);
    }
    // Find the top numServersToCheck servers among accounts followed by the user.
    // These are the servers we will check for trending toots.
    const popularServers = Object.keys(userServerCounts)
        .sort((a, b) => userServerCounts[b] - userServerCounts[a])
        .slice(0, numServersToCheck);
    console.debug(`mastodonServersInfo() userServerCounts: `, userServerCounts);
    console.debug(`Top ${numServersToCheck} servers: `, popularServers);
    const monthlyUsers = await Promise.all(popularServers.map(s => getMonthlyUsers(s)));
    const serverMAUs = {};
    const overrepresentedServerFrequ = {};
    popularServers.forEach((server, i) => {
        if (monthlyUsers[i] < Storage_1.default.getConfig().minServerMAU) {
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
exports.default = mastodonServersInfo;
;
// Get publicly available MAU information. Requires no login (??)
async function getMonthlyUsers(server) {
    if (Storage_1.default.getConfig().noMauServers.some(s => server.startsWith(s))) {
        console.debug(`monthlyUsers() for '${server}' is not available`);
        return 0;
    }
    try {
        const instance = await (0, api_1.mastodonFetch)(server, api_1.MastoApi.v2Url("instance"));
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    }
    catch (error) {
        console.warn(`Error in getMonthlyUsers() for server ${server}`, error);
        return 0;
    }
}
exports.getMonthlyUsers = getMonthlyUsers;
;
async function fetchTrendingTags(server, numTags) {
    numTags ||= Storage_1.default.getConfig().numTrendingTootsPerServer;
    const tagsUrl = api_1.MastoApi.trendUrl("tags");
    let _tags;
    try {
        _tags = await (0, api_1.mastodonFetch)(server, tagsUrl, numTags);
        if (!_tags || _tags.length == 0)
            throw new Error(`No tags found on '${server}'!`);
    }
    catch (e) {
        console.warn(`[TrendingTags] Failed to get trending toots from '${server}'!`, e);
        return [];
    }
    const tags = _tags.map(tag_1.decorateTrendingTag);
    console.debug(`[TrendingTags] trendingTags for server '${server}':`, tags);
    return tags;
}
exports.fetchTrendingTags = fetchTrendingTags;
;
//# sourceMappingURL=mastodon_servers_info.js.map