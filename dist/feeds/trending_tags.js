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
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/tags";
async function getTrendingTags(api) {
    console.log(`[TrendingTags] getTrendingTags() called`);
    const coreServers = await mastodon_api_cache_1.default.getCoreServer(api);
    // Count the number of followed users per server
    const topServerDomains = Object.keys(coreServers)
        .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
        .sort((a, b) => (coreServers[b] - coreServers[a]));
    console.log(`[TrendingTags] Found top mastodon servers: `, topServerDomains);
    // Pull top trending toots from each server
    const trendingTags = await Promise.all(topServerDomains.map(async (server) => {
        let tags = await (0, helpers_1.mastodonFetch)(server, TRENDING_TOOTS_REST_PATH);
        if (!tags || tags.length == 0) {
            console.warn(`[TrendingTags] Failed to get trending toots from '${server}'! trendingTags:`, tags);
            return [];
        }
        // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
        // and inject a trendingRank score property that is reverse-ordered, e.g most popular trending
        // toot gets NUM_TRENDING_TOOTS_PER_SERVER points, least trending gets 1).
        // serverTopToots = serverTopToots.filter(toot => toot?.favouritesCount > 0 || toot?.reblogsCount > 0)
        tags = tags.slice(0, NUM_TRENDING_TOOTS_PER_SERVER);
        //    .map((tag: TrendingTag, i: number) => {
        //         // Inject the @server info to the account string
        //         const acct = tag.account.acct;
        //         if (acct && !acct.includes("@")) {
        //             toot.account.acct = `${acct}@${toot.account.url.split("/")[2]}`;
        //         }
        //         // Inject trendingRank score
        //         toot.trendingRank = NUM_TRENDING_TOOTS_PER_SERVER - i + 1;
        //         return toot;
        //    });
        console.log(`[TrendingTags] trendingTags for server '${server}':`, tags);
        return tags;
    }));
    return trendingTags.flat();
}
exports.default = getTrendingTags;
;
//# sourceMappingURL=trending_tags.js.map