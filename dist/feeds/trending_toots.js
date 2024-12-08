"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mastodon_api_cache_1 = __importDefault(require("../api/mastodon_api_cache"));
const helpers_1 = require("../helpers");
const toot_1 = require("../api/objects/toot");
const toot_2 = require("../api/objects/toot");
const api_1 = require("../api/api");
async function getTrendingToots(api) {
    console.log(`[TrendingToots] getTrendingToots() called`);
    const topServerDomains = await mastodon_api_cache_1.default.getTopServerDomains(api);
    // Pull top trending toots from each server
    let trendingTootses = await Promise.all(topServerDomains.map(async (server) => {
        let topToots = [];
        try {
            topToots = await (0, api_1.mastodonFetch)(server, api_1.MastoApi.trendUrl("statuses"));
            if (!topToots?.length)
                throw new Error(`Failed to get topToots: ${JSON.stringify(topToots)}`);
        }
        catch (e) {
            console.warn(`Error fetching trending toots from '${server}':`, e);
            return [];
        }
        // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
        // and inject a trendingRank score property that is reverse-ordered, e.g most popular trending
        // toot gets numTrendingTootsPerServer points, least trending gets 1).
        topToots = topToots.filter(toot => (0, toot_1.popularity)(toot) > 0)
            .map((toot, i) => {
            // Inject the @server info to the account string
            const acct = toot.account.acct;
            if (acct && !acct.includes("@")) {
                console.debug(`Injecting @server info to account string '${acct}' for toot:`, toot);
                toot.account.acct = `${acct}@${toot.account.url.split("/")[2]}`;
            }
            // Inject trendingRank score
            toot.trendingRank = 1 + (topToots?.length || 0) - i;
            return toot;
        });
        console.debug(`trendingToots for '${server}': `, topToots.map(toot_1.condensedStatus));
        return topToots;
    }));
    return (0, toot_2.dedupeToots)(setTrendingRankToAvg(trendingTootses.flat()), "getTrendingToots");
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
        // const msg = `Found ${toots.length} toots of ${uri} (trendingRanks: ${trendingRanks}, avg: ${avgScore}).`;
        // console.debug(`${msg} First toot:`, toots[0]);
        toots.forEach(toot => toot.trendingRank = avgScore);
    });
    return rankedToots;
}
;
//# sourceMappingURL=trending_toots.js.map