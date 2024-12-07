"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mastodon_api_cache_1 = __importDefault(require("../api/mastodon_api_cache"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = require("../api/objects/toot");
const mastodon_servers_info_1 = require("../api/mastodon_servers_info");
const api_1 = require("../api/api");
const toot_2 = require("../api/objects/toot");
const LOG_PREFIX = "[TrendingTags]";
async function getRecentTootsForTrendingTags(api) {
    const tags = await getTrendingTags(api);
    const tootses = await Promise.all(tags.map((tag) => (0, api_1.getTootsForTag)(api, tag)));
    const toots = (0, toot_1.dedupeToots)(tootses.flat(), "trendingTags");
    return toots.sort(toot_2.popularity).reverse().slice(0, Storage_1.default.getConfig().numTrendingTagsToots);
}
exports.default = getRecentTootsForTrendingTags;
;
// Find tags that are trending across the Fediverse by adding up the number uses of the tag
async function getTrendingTags(api) {
    console.log(`${LOG_PREFIX} getTrendingTags() called`);
    const topDomains = await mastodon_api_cache_1.default.getTopServerDomains(api);
    const trendingTags = await Promise.all(topDomains.map(mastodon_servers_info_1.fetchTrendingTags));
    // Aggregate how many toots and users in the past NUM_DAYS_TO_COUNT_TAG_DATA days across all servers
    const aggregatedTags = trendingTags.flat().reduce((tags, tag) => {
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
    aggregatedTags.sort((a, b) => (b.numToots || 0) - (a.numToots || 0));
    console.log(`${LOG_PREFIX} Aggregated trending tags:`, aggregatedTags);
    return aggregatedTags.slice(0, Storage_1.default.getConfig().numTrendingTags);
}
;
//# sourceMappingURL=trending_tags.js.map