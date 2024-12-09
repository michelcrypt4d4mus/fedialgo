"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("../api/objects/toot"));
const mastodon_servers_info_1 = require("../api/mastodon_servers_info");
const api_1 = require("../api/api");
const LOG_PREFIX = "[TrendingTags]";
async function getRecentTootsForTrendingTags(api) {
    const tags = await getTrendingTags(api);
    const tootses = await Promise.all(tags.map(getTootsForTag));
    const toots = toot_1.default.dedupeToots(tootses.flat(), "trendingTags");
    toots.sort((a, b) => b.popularity() - a.popularity());
    return toots.slice(0, Storage_1.default.getConfig().numTrendingTagsToots);
}
exports.default = getRecentTootsForTrendingTags;
;
// Find tags that are trending across the Fediverse by adding up the number uses of the tag
async function getTrendingTags(api) {
    console.log(`${LOG_PREFIX} getTrendingTags() called`);
    const topDomains = await api_1.MastoApi.instance.getTopServerDomains();
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