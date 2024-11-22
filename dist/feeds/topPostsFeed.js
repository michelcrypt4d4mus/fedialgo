"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureStore_1 = __importDefault(require("../features/FeatureStore"));
const Storage_1 = __importDefault(require("../Storage"));
const helpers_1 = require("../helpers");
const helpers_2 = require("../helpers");
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/statuses";
const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_MS_BEFORE_REFRESH = NUM_HOURS_BEFORE_REFRESH * 60 * 60 * 1000;
const NUM_SERVERS_TO_POLL = 10;
const NUM_TOP_POSTS_PER_SERVER = 10;
async function topPostsFeed(api) {
    const coreServers = await FeatureStore_1.default.getCoreServer(api);
    // Get list of top mastodon servers // TODO: what does "top" mean here?
    const servers = Object.keys(coreServers)
        .sort((a, b) => (coreServers[b] - coreServers[a])) // TODO: wtf is this comparison?
        .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0) // Remove weird records
        .slice(0, NUM_SERVERS_TO_POLL);
    if (servers.length == 0) {
        console.warn("No mastodon servers found to get topPostsFeed data from!");
        return [];
    }
    console.log(`Found top mastodon servers: `, servers);
    let trendingToots = [];
    // Pull top trending toots from each server
    trendingToots = await Promise.all(servers.map(async (server) => {
        let serverTopToots = await (0, helpers_2.mastodonFetch)(server, TRENDING_TOOTS_REST_PATH);
        if (!serverTopToots || serverTopToots.length == 0) {
            console.warn(`Failed to get trending toots from '${server}'! serverTopToots: `, serverTopToots);
            return [];
        }
        // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
        // and inject a topPost score property that is reverse-ordered, e.g most popular trending
        // toot gets NUM_TOP_POSTS_PER_SERVER points, least trending gets 1).
        serverTopToots = serverTopToots.filter(status => status?.favouritesCount > 0 || status?.reblogsCount > 0)
            .slice(0, NUM_TOP_POSTS_PER_SERVER)
            .map((status, i) => {
            // Inject the @server info to the account string
            const acct = status.account.acct;
            if (acct && !acct.includes("@")) {
                status.account.acct = `${acct}@${status.account.url.split("/")[2]}`;
            }
            // Inject topPost scoring
            status.topPost = NUM_TOP_POSTS_PER_SERVER - i;
            return status;
        });
        console.log(`topToots for server '${server}': `, serverTopToots.map(helpers_1.condensedStatus));
        return serverTopToots;
    }));
    const lastOpenedAt = new Date((await Storage_1.default.getLastOpened() ?? 0) - NUM_MS_BEFORE_REFRESH);
    return trendingToots.flat().filter((status) => new Date(status.createdAt) > lastOpenedAt);
}
exports.default = topPostsFeed;
;
//# sourceMappingURL=topPostsFeed.js.map