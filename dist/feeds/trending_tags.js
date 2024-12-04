"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mastodon_api_cache_1 = __importDefault(require("../features/mastodon_api_cache"));
const helpers_1 = require("../helpers");
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/tags";
const NUM_DAYS_TO_COUNT_TAG_DATA = 3;
const NUM_TRENDING_TAGS_PER_SERVER = 20;
const NUM_TRENDING_TAG_TOOTS_PER_SERVER = 20;
const NUM_TRENDING_TAGS = 20;
const NUM_TRENDING_TAG_TOOTS = 100;
async function getRecentTootsForTrendingTags(api) {
    const tags = await getTrendingTags(api);
    const tootses = await Promise.all(tags.map((tag) => getTootsForTag(api, tag)));
    const toots = (0, helpers_1.dedupeToots)(tootses.flat(), "trendingTags");
    console.log(`[TrendingTags] deduped toots for trending tags:`, toots);
    return toots;
}
exports.default = getRecentTootsForTrendingTags;
;
// Find tags that are trending across the Fediverse by adding up the number uses of the tag
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
        tags = tags.slice(0, NUM_TRENDING_TAGS_PER_SERVER);
        tags.forEach(decorateTagData);
        console.debug(`[TrendingTags] trendingTags for server '${server}':`, tags);
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
    console.log(`[TrendingTags] Aggregated trending tags:`, aggregatedTags);
    return aggregatedTags.slice(0, NUM_TRENDING_TAGS);
}
;
async function getTootsForTag(api, tag) {
    try {
        console.debug(`[TrendingTags] getting toots for tag:`, tag);
        const mastoQuery = { limit: NUM_TRENDING_TAG_TOOTS_PER_SERVER, q: tag.name, type: "statuses" };
        const searchResult = await api.v2.search.fetch(mastoQuery);
        const toots = searchResult.statuses;
        toots.forEach((toot) => {
            toot.trendingTags ||= [];
            toot.trendingTags.push(tag);
        });
        console.debug(`[TrendingTags] Found toots for tag '${tag.name}':`, toots);
        return toots;
    }
    catch (e) {
        console.warn(`[TrendingTags] Failed to get toots for tag '${tag.name}':`, e);
        return [];
    }
}
;
// Inject toot and account counts (how many toots and users are using the trending tag)
function decorateTagData(tag) {
    if (!tag?.history || tag.history.length == 0) {
        console.warn(`[TrendingTags] decorateTagData() found no history for tag:`, tag);
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