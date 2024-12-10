"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
 *        ]
 *   }
 */
const mastodon_server_1 = __importDefault(require("../api/mastodon_server"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("../api/objects/toot"));
const api_1 = require("../api/api");
const LOG_PREFIX = "[TrendingTags]";
async function fetchRecentTootsForTrendingTags() {
    const trendingTags = await getTrendingTags();
    const tootTags = await Promise.all(trendingTags.map(getTootsForTag));
    const toots = toot_1.default.dedupeToots(tootTags.flat(), LOG_PREFIX);
    toots.sort((a, b) => b.popularity() - a.popularity());
    console.debug(`fetchRecentTootsForTrendingTags() possible toots:`, toots);
    return toots.slice(0, Storage_1.default.getConfig().numTrendingTagsToots);
}
exports.default = fetchRecentTootsForTrendingTags;
;
// Find tags that are trending across the Fediverse by adding up the number uses of the tag
async function getTrendingTags() {
    console.log(`${LOG_PREFIX} getTrendingTags() called`);
    const topDomains = await api_1.MastoApi.instance.getTopServerDomains();
    const serversTrendingTags = await Promise.all(topDomains.map(s => new mastodon_server_1.default(s).fetchTrendingTags()));
    // Aggregate how many toots and users in the past NUM_DAYS_TO_COUNT_TAG_DATA days across all servers
    const trendingTags = serversTrendingTags.flat().reduce((tags, tag) => {
        const existingTag = tags.find(t => t.name === tag.name);
        if (existingTag) {
            existingTag.numAccounts = (existingTag.numAccounts || 0) + (tag.numAccounts || 0);
            existingTag.numToots = (existingTag.numToots || 0) + (tag.numToots || 0);
        }
        else {
            tags.push(tag);
        }
        return tags;
    }, []);
    trendingTags.sort((a, b) => (b.numToots || 0) - (a.numToots || 0));
    console.log(`${LOG_PREFIX} Aggregated trending tags:`, trendingTags);
    return trendingTags.slice(0, Storage_1.default.getConfig().numTrendingTags);
}
;
// Get latest toots for a given tag and populate trendingToots property
async function getTootsForTag(tag) {
    // TODO: this doesn't append a an octothorpe to the tag name when searching. Should it?
    const toots = await api_1.MastoApi.instance.searchForToots(tag.name, Storage_1.default.getConfig().numTootsPerTrendingTag);
    // Inject the tag into each toot as a trendingTag element
    toots.forEach((toot) => {
        toot.trendingTags ||= [];
        toot.trendingTags.push(tag);
    });
    console.debug(`Found toots for trending tag '${tag.name}':`, toots);
    return toots;
}
;
//# sourceMappingURL=trending_tags.js.map