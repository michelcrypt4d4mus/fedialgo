"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTrendingTags = exports.mastodonServersInfo = void 0;
/*
 * Methods for making calls to the publilcly available Mastodon API methods
 * that don't require authentication.
 */
const axios_1 = __importDefault(require("axios"));
const change_case_1 = require("change-case");
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const helpers_1 = require("../helpers");
const tag_1 = require("./objects/tag");
const account_1 = require("./objects/account");
const api_1 = require("./api");
const helpers_2 = require("../helpers");
// Returns something called "overrepresentedServerFrequ"??
async function mastodonServersInfo(follows) {
    // Tally what Mastodon servers the accounts that the user follows live on
    const followedServerUserCounts = (0, helpers_1.countValues)(follows, follow => (0, account_1.extractServer)(follow));
    const config = Storage_1.default.getConfig();
    console.debug(`mastodonServersInfo() userServerCounts: `, followedServerUserCounts);
    // Find the top numServersToCheck servers among accounts followed by the user.
    // These are the servers we will check for trending toots.
    const mostFollowedServers = Object.keys(followedServerUserCounts)
        .sort((a, b) => followedServerUserCounts[b] - followedServerUserCounts[a])
        .slice(0, config.numServersToCheck);
    let serverMAUs = await (0, helpers_1.zipPromises)(mostFollowedServers, getMonthlyUsers);
    const validServers = (0, helpers_1.atLeastValues)(serverMAUs, config.minServerMAU);
    const numValidServers = Object.keys(validServers).length;
    const numDefaultServers = config.numServersToCheck - numValidServers;
    console.debug(`Most followed servers:`, mostFollowedServers, `\nserverMAUs:`, serverMAUs, `\nvalidServers:`, validServers);
    if (numDefaultServers > 0) {
        console.warn(`Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} threshold`);
        const extraServers = config.defaultServers.filter(s => !validServers[s]).slice(0, numDefaultServers);
        const extraServerMAUs = await (0, helpers_1.zipPromises)(extraServers, getMonthlyUsers);
        console.log(`Got popular server MAUs:`, extraServerMAUs);
        serverMAUs = { ...validServers, ...extraServerMAUs };
    }
    const overrepresentedServerFreq = Object.keys(serverMAUs).reduce((overRepped, server) => {
        overRepped[server] = (followedServerUserCounts[server] || 0) / serverMAUs[server];
        return overRepped;
    }, {});
    console.log(`Final serverMAUs: `, serverMAUs);
    console.log(`Final overrepresentedServerFrequ: `, overrepresentedServerFreq);
    return overrepresentedServerFreq;
}
exports.mastodonServersInfo = mastodonServersInfo;
;
// Get the tags that are trending on 'server'
async function fetchTrendingTags(server, numTags) {
    numTags ||= Storage_1.default.getConfig().numTrendingTootsPerServer;
    const tagsUrl = api_1.MastoApi.trendUrl("tags");
    let _tags;
    try {
        _tags = await mastodonPublicFetch(server, tagsUrl, numTags);
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
// Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
async function fetchTrendingToots() {
    console.log(`[TrendingToots] getTrendingToots() called`);
    const topServerDomains = await api_1.MastoApi.instance.getTopServerDomains();
    // Pull top trending toots from each server
    let trendingTootses = await Promise.all(topServerDomains.map(async (server) => {
        let topToots = [];
        try {
            topToots = await mastodonPublicFetch(server, api_1.MastoApi.trendUrl(api_1.STATUSES));
            if (!topToots?.length)
                throw new Error(`Failed to get topToots: ${JSON.stringify(topToots)}`);
            topToots = topToots.map(t => new toot_1.default(t));
        }
        catch (e) {
            console.warn(`Error fetching trending toots from '${server}':`, e);
            return [];
        }
        // Inject toots with at least one favorite of retoot with a trendingRank score that is reverse-ordered.
        // e.g most popular trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        topToots = topToots.filter(toot => toot.popularity() > 0);
        topToots.forEach((toot, i) => toot.trendingRank = 1 + (topToots?.length || 0) - i);
        console.debug(`trendingToots for '${server}': `, topToots.map(t => t.condensedStatus()));
        return topToots;
    }));
    const trendingToots = setTrendingRankToAvg(trendingTootses.flat());
    return toot_1.default.dedupeToots(trendingToots, "getTrendingToots");
}
exports.default = fetchTrendingToots;
;
// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
function setTrendingRankToAvg(rankedToots) {
    const tootsTrendingOnMultipleServers = (0, helpers_1.groupBy)(rankedToots, (toot) => toot.uri);
    Object.entries(tootsTrendingOnMultipleServers).forEach(([_uri, toots]) => {
        const avgScore = (0, helpers_1.average)(toots.map(t => t.trendingRank));
        toots.forEach(toot => toot.trendingRank = avgScore);
    });
    return rankedToots;
}
;
// Get publicly available MAU information. Requires no login (??)
async function getMonthlyUsers(server) {
    if (Storage_1.default.getConfig().noMauServers.some(s => server.startsWith(s))) {
        console.debug(`monthlyUsers() for '${server}' is not available, skipping...`);
        return 0;
    }
    try {
        const instance = await mastodonPublicFetch(server, api_1.MastoApi.v2Url("instance"));
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    }
    catch (error) {
        console.warn(`Error in getMonthlyUsers() for server ${server}`, error);
        return 0;
    }
}
;
// Get data from a public API endpoint on a Mastodon server.
async function mastodonPublicFetch(server, endpoint, limit) {
    let url = `https://${server}/${endpoint}`;
    if (limit)
        url += `?limit=${limit}`;
    console.debug(`mastodonFetch() URL: '${url}'`);
    try {
        const json = await axios_1.default.get(url);
        console.debug(`mastodonFetch() response for '${url}':`, json);
        if (json.status === 200 && json.data) {
            return (0, helpers_2.transformKeys)(json.data, change_case_1.camelCase);
        }
        else {
            throw json;
        }
    }
    catch (e) {
        console.warn(`Error fetching data from '${url}'`, e);
        return;
    }
}
;
//# sourceMappingURL=mastodon_servers_info.js.map