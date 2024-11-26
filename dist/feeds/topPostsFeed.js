"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mastodon_api_cache_1 = __importDefault(require("../features/mastodon_api_cache"));
const Storage_1 = __importDefault(require("../Storage"));
const helpers_1 = require("../helpers");
const helpers_2 = require("../helpers");
const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_MS_BEFORE_REFRESH = NUM_HOURS_BEFORE_REFRESH * 60 * 60 * 1000;
const NUM_SERVERS_TO_POLL = 10;
const NUM_TRENDING_TOOTS_PER_SERVER = 10;
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/statuses";
async function topPostsFeed(api) {
    const coreServers = await mastodon_api_cache_1.default.getCoreServer(api);
    // Get list of top mastodon servers // TODO: what does "top" mean here?
    const topServerDomains = Object.keys(coreServers)
        .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
        .sort((a, b) => (coreServers[b] - coreServers[a])) // TODO: wtf is this comparison?
        .slice(0, NUM_SERVERS_TO_POLL);
    if (topServerDomains.length == 0) {
        console.warn("No mastodon servers found to get topPostsFeed data from!");
        return [];
    }
    console.log(`Found top mastodon servers: `, topServerDomains);
    // Pull top trending toots from each server
    const trendingToots = await Promise.all(topServerDomains.map(async (server) => {
        let serverTopToots = await (0, helpers_2.mastodonFetch)(server, TRENDING_TOOTS_REST_PATH);
        if (!serverTopToots || serverTopToots.length == 0) {
            console.warn(`Failed to get trending toots from '${server}'! serverTopToots:`, serverTopToots);
            return [];
        }
        // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
        // and inject a topPost score property that is reverse-ordered, e.g most popular trending
        // toot gets NUM_TRENDING_TOOTS_PER_SERVER points, least trending gets 1).
        serverTopToots = serverTopToots.filter(toot => toot?.favouritesCount > 0 || toot?.reblogsCount > 0)
            .slice(0, NUM_TRENDING_TOOTS_PER_SERVER)
            .map((toot, i) => {
            // Inject the @server info to the account string
            const acct = toot.account.acct;
            if (acct && !acct.includes("@")) {
                toot.account.acct = `${acct}@${toot.account.url.split("/")[2]}`;
            }
            // Inject trendingRank score
            // TODO: maybe should be placed in top.scores.trendingRank variable/
            toot.trendingRank = NUM_TRENDING_TOOTS_PER_SERVER - i;
            return toot;
        });
        console.log(`topToots for server '${server}': `, serverTopToots.map(helpers_1.condensedStatus));
        return serverTopToots;
    }));
    const lastOpenedAt = new Date((await Storage_1.default.getLastOpenedTimestamp() ?? 0) - NUM_MS_BEFORE_REFRESH);
    return trendingToots.flat().filter((toot) => new Date(toot.createdAt) > lastOpenedAt);
}
exports.default = topPostsFeed;
;
//# sourceMappingURL=topPostsFeed.js.map