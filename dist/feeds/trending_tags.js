"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRecentTootsForTrendingTags = void 0;
/*
 * Pull top trending tags on mastodon servers and get a set of toots for each.
 * Example trending tag:
 *   {
 *       "name": "southkorea",
 *       "url": "https://journa.host/tags/southkorea",
 *       "history": [
 *           {
 *               "day": "1733184000",
 *               "accounts": "125",
 *               "uses": "374"
 *           },
 *           {
 *               "day": "1733097600",
 *               "accounts": "4",
 *               "uses": "146"
 *           },
 *           <...snip, usually 7 days of info...>
 *       ]
 *   }
 */
const mastodon_server_1 = __importDefault(require("../api/mastodon_server"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("../api/objects/toot"));
const api_1 = require("../api/api");
const LOG_PREFIX = "TrendingTags";
// Get toots for the top trending tags via the search endpoint. Results are not cached explicity
// though they are implicitly cached as part of the main timeline cache.
// TODO: Move this to mastodon_server.ts or api.ts
async function fetchRecentTootsForTrendingTags() {
    const trendingTags = await mastodon_server_1.default.fediverseTrendingTags();
    const tootTags = await Promise.all(trendingTags.map(getTootsForTag));
    const toots = toot_1.default.dedupeToots(tootTags.flat(), LOG_PREFIX);
    toots.sort((a, b) => b.popularity() - a.popularity());
    return toots.slice(0, Storage_1.default.getConfig().numTrendingTagsToots);
}
exports.fetchRecentTootsForTrendingTags = fetchRecentTootsForTrendingTags;
;
// Get latest toots for a given tag and populate trendingToots property
// TODO: there's an endpoint for getting recent tags but this is using the search endpoint.
// TODO: this doesn't append a an octothorpe to the tag name when searching. Should it?
async function getTootsForTag(tag) {
    const numToots = Storage_1.default.getConfig().numTootsPerTrendingTag;
    return await api_1.MastoApi.instance.searchForToots(tag.name, numToots, 'trending tag');
}
;
//# sourceMappingURL=trending_tags.js.map