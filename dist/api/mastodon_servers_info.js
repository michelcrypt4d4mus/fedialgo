"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastodonFetch = exports.fetchTrendingTags = exports.mastodonServersInfo = void 0;
/*
 * Methods for making calls to the publilcly available Mastodon API methods
 * that don't require authentication.
 */
const axios_1 = __importDefault(require("axios"));
const change_case_1 = require("change-case");
const Storage_1 = __importDefault(require("../Storage"));
const helpers_1 = require("../helpers");
const tag_1 = require("./objects/tag");
const account_1 = require("./objects/account");
const api_1 = require("./api");
const helpers_2 = require("../helpers");
;
// Returns something called "overrepresentedServerFrequ"??
async function mastodonServersInfo(follows) {
    // Tally what Mastodon servers the accounts that the user follows live on
    const userServerCounts = (0, helpers_1.countValues)(follows, follow => (0, account_1.extractServer)(follow));
    const config = Storage_1.default.getConfig();
    console.debug(`mastodonServersInfo() userServerCounts: `, userServerCounts);
    // Find the top numServersToCheck servers among accounts followed by the user.
    // These are the servers we will check for trending toots.
    const mostFollowedServers = Object.keys(userServerCounts)
        .sort((a, b) => userServerCounts[b] - userServerCounts[a])
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
    const overrepresentedServerFrequ = Object.keys(serverMAUs).reduce((overRepped, server) => {
        overRepped[server] = (userServerCounts[server] || 0) / serverMAUs[server];
        return overRepped;
    }, {});
    console.log(`Final serverMAUs: `, serverMAUs);
    console.log(`Final overrepresentedServerFrequ: `, overrepresentedServerFrequ);
    return overrepresentedServerFrequ;
}
exports.mastodonServersInfo = mastodonServersInfo;
;
// Get the tags that are trending on 'server'
async function fetchTrendingTags(server, numTags) {
    numTags ||= Storage_1.default.getConfig().numTrendingTootsPerServer;
    const tagsUrl = api_1.MastoApi.trendUrl("tags");
    let _tags;
    try {
        _tags = await (0, exports.mastodonFetch)(server, tagsUrl, numTags);
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
// Retrieve Mastodon server information from a given server's public (no auth) endpoint
const mastodonFetch = async (server, endpoint, limit) => {
    let url = `https://${server}/${endpoint}`;
    if (limit)
        url += `?limit=${limit}`;
    console.debug(`mastodonFetch() ${url}'...`);
    try {
        const json = await axios_1.default.get(url);
        console.debug(`mastodonFetch() response for ${url}:`, json);
        if (json.status === 200 && json.data) {
            return (0, helpers_2.transformKeys)(json.data, change_case_1.camelCase);
        }
        else {
            throw json;
        }
    }
    catch (e) {
        console.warn(`Error fetching data for server ${server} from endpoint '${endpoint}'`, e);
        return;
    }
};
exports.mastodonFetch = mastodonFetch;
// Get publicly available MAU information. Requires no login (??)
async function getMonthlyUsers(server) {
    if (Storage_1.default.getConfig().noMauServers.some(s => server.startsWith(s))) {
        console.debug(`monthlyUsers() for '${server}' is not available`);
        return 0;
    }
    try {
        const instance = await (0, exports.mastodonFetch)(server, api_1.MastoApi.v2Url("instance"));
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    }
    catch (error) {
        console.warn(`Error in getMonthlyUsers() for server ${server}`, error);
        return 0;
    }
}
;
//# sourceMappingURL=mastodon_servers_info.js.map