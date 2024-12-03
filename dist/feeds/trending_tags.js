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
const NUM_DAYS_TO_COUNT_TAG_DATA = 3;
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
        tags = tags.slice(0, NUM_TRENDING_TOOTS_PER_SERVER);
        tags.forEach(decorateTagData);
        console.log(`[TrendingTags] trendingTags for server '${server}':`, tags);
        return tags;
    }));
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
    return aggregatedTags;
}
exports.default = getTrendingTags;
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