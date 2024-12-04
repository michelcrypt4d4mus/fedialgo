"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mastodon_api_cache_1 = __importDefault(require("../features/mastodon_api_cache"));
const helpers_1 = require("../helpers");
const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_MS_BEFORE_REFRESH = NUM_HOURS_BEFORE_REFRESH * 60 * 60 * 1000;
const NUM_TRENDING_TOOTS_PER_SERVER = 30;
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/statuses";
async function getTrendingToots(api) {
    const coreServers = await mastodon_api_cache_1.default.getCoreServer(api);
    // Count the number of followed users per server
    const topServerDomains = Object.keys(coreServers)
        .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
        .sort((a, b) => (coreServers[b] - coreServers[a]));
    if (topServerDomains.length == 0) {
        console.warn("No mastodon servers found to get getTrendingToots data from!");
        return [];
    }
    console.log(`Found top mastodon servers: `, topServerDomains);
    // Pull top trending toots from each server
    let trendingTootses = await Promise.all(topServerDomains.map(async (server) => {
        let serverTopToots = await (0, helpers_1.mastodonFetch)(server, TRENDING_TOOTS_REST_PATH);
        if (!serverTopToots || serverTopToots.length == 0) {
            console.warn(`Failed to get trending toots from '${server}'! serverTopToots:`, serverTopToots);
            return [];
        }
        // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
        // and inject a trendingRank score property that is reverse-ordered, e.g most popular trending
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
            toot.trendingRank = NUM_TRENDING_TOOTS_PER_SERVER - i + 1;
            return toot;
        });
        console.debug(`trendingToots for '${server}': `, serverTopToots.map(helpers_1.condensedStatus));
        return serverTopToots;
    }));
    const trendingToots = (0, helpers_1.dedupeToots)(setTrendingRankToAvg(trendingTootses.flat()), "getTrendingToots");
    console.log(`[getTrendingToots] trendingToots:`, trendingToots);
    return trendingToots;
}
exports.default = getTrendingToots;
;
// A toot can trend on multiple servers, in which case we want to compute the
// average trendingRank and update the toots accordingly.
// TODO: maybe we should add the # of servers to the avg?
function setTrendingRankToAvg(rankedToots) {
    const tootsTrendingOnMultipleServers = rankedToots.reduce((acc, toot) => {
        if (!toot.trendingRank)
            return acc;
        acc[toot.uri] ||= [];
        acc[toot.uri].push(toot);
        return acc;
    }, {});
    Object.entries(tootsTrendingOnMultipleServers).forEach(([uri, toots]) => {
        if (toots.length <= 1)
            return;
        const trendingRanks = toots.map(t => t.trendingRank);
        const avgScore = (0, helpers_1.average)(trendingRanks);
        const msg = `Found ${toots.length} of ${uri} (trendingRanks: ${trendingRanks}, avg: ${avgScore}).`;
        console.debug(`${msg} First toot:`, toots[0]);
        toots.forEach(toot => toot.trendingRank = avgScore);
    });
    return rankedToots;
}
;
//# sourceMappingURL=trending_toots.js.map