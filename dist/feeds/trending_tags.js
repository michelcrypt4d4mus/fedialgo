"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_PREFIX = void 0;
const mastodon_api_cache_1 = __importDefault(require("../api/mastodon_api_cache"));
const helpers_1 = require("../helpers");
const toot_1 = require("../objects/toot");
const api_1 = require("../api/api");
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/tags";
const NUM_DAYS_TO_COUNT_TAG_DATA = 3;
const NUM_TRENDING_TAGS_PER_SERVER = 20;
const NUM_TRENDING_TAG_TOOTS_PER_SERVER = 20;
const NUM_TRENDING_TAGS = 20;
const NUM_TRENDING_TAG_TOOTS = 100;
exports.LOG_PREFIX = "[TrendingTags]";
async function getRecentTootsForTrendingTags(api) {
    const tags = await getTrendingTags(api);
    const tootses = await Promise.all(tags.map((tag) => (0, api_1.getTootsForTag)(api, tag)));
    const toots = (0, helpers_1.dedupeToots)(tootses.flat(), "trendingTags");
    console.log(`${exports.LOG_PREFIX} deduped toots for trending tags:`, toots);
    return toots.sort(toot_1.popularity).reverse().slice(0, NUM_TRENDING_TAG_TOOTS);
}
exports.default = getRecentTootsForTrendingTags;
;
// Find tags that are trending across the Fediverse by adding up the number uses of the tag
async function getTrendingTags(api) {
    console.log(`${exports.LOG_PREFIX} getTrendingTags() called`);
    const topDomains = await mastodon_api_cache_1.default.getTopServerDomains(api);
    // Pull top trending toots from each server
    const trendingTags = await Promise.all(topDomains.map(async (server) => {
        let tags = [];
        try {
            tags = await (0, api_1.mastodonFetch)(server, TRENDING_TOOTS_REST_PATH);
            if (!tags || tags.length == 0)
                throw new Error(`No tags found on '${server}'!`);
        }
        catch (e) {
            console.warn(`${exports.LOG_PREFIX} Failed to get trending toots from '${server}'!`, e);
            return [];
        }
        tags = tags.slice(0, NUM_TRENDING_TAGS_PER_SERVER);
        tags.forEach(decorateTagData);
        console.debug(`${exports.LOG_PREFIX} trendingTags for server '${server}':`, tags);
        return tags;
    }));
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
    console.log(`${exports.LOG_PREFIX} Aggregated trending tags:`, aggregatedTags);
    return aggregatedTags.slice(0, NUM_TRENDING_TAGS);
}
;
// Lowercase the tag text; Inject toot / account counts summed over last NUM_DAYS_TO_COUNT_TAG_DATA.
function decorateTagData(tag) {
    tag.name = tag.name.toLowerCase();
    if (!tag?.history || tag.history.length == 0) {
        console.warn(`${exports.LOG_PREFIX} decorateTagData() found no history for tag:`, tag);
        tag.numAccounts = 0;
        tag.numToots = 0;
        return;
    }
    const recentHistory = tag.history.slice(0, NUM_DAYS_TO_COUNT_TAG_DATA);
    tag.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    tag.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
}
;
//# sourceMappingURL=trending_tags.js.map