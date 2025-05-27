"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentTootsForTrendingTags = exports.getParticipatedHashtagToots = exports.getFavouritedTagToots = void 0;
/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
const api_1 = __importDefault(require("../api/api"));
const tag_list_1 = __importDefault(require("../api/objects/tag_list"));
const string_helpers_1 = require("../helpers/string_helpers");
const types_1 = require("../types");
const config_1 = require("../config");
const log_helpers_1 = require("../helpers/log_helpers");
// Get toots for hashtags the user has favourited a lot
async function getFavouritedTagToots() {
    const logPrefix = (0, string_helpers_1.bracketed)(types_1.CacheKey.FAVOURITED_HASHTAG_TOOTS);
    const favouritedTags = await tag_list_1.default.fromFavourites();
    const participatedTags = (await tag_list_1.default.fromParticipated()).tagNameDict();
    // Filter out tags that are already followed or have high participation by the fedialgo user
    let tags = favouritedTags.tags.filter((tag) => {
        if (config_1.config.trending.tags.invalidTrendingTags.includes(tag.name)) {
            return false;
        }
        else if ((participatedTags[tag.name]?.numToots || 0) >= 2) { // TODO: make this a config value or (better) a heuristic based on the data
            return false;
        }
        else {
            return true;
        }
    });
    tags = (new tag_list_1.default(tags)).topTags(config_1.config.favouritedTags.numTags);
    (0, log_helpers_1.traceLog)(`${logPrefix} Using tags:\n   ` + tags.map(tag => `${tag.name} (${tag.numToots} faves)`).join("\n   "));
    return await getCacheableTootsForTags(tags, types_1.CacheKey.FAVOURITED_HASHTAG_TOOTS, config_1.config.favouritedTags);
}
exports.getFavouritedTagToots = getFavouritedTagToots;
;
// Get recent toots from hashtags the user has participated in frequently
async function getParticipatedHashtagToots() {
    const logPrefix = (0, string_helpers_1.bracketed)(types_1.CacheKey.PARTICIPATED_TAG_TOOTS);
    const tagList = await tag_list_1.default.fromParticipated();
    const tags = tagList.topTags();
    console.debug(`${logPrefix} Gettings toots for participated tags:`, tags);
    return await getCacheableTootsForTags(tags, types_1.CacheKey.PARTICIPATED_TAG_TOOTS, config_1.config.participatedTags);
}
exports.getParticipatedHashtagToots = getParticipatedHashtagToots;
;
// Get toots for the top trending tags via the search endpoint.
async function getRecentTootsForTrendingTags() {
    const tagList = await tag_list_1.default.fromTrending();
    return await getCacheableTootsForTags(tagList.topTags(), types_1.CacheKey.TRENDING_TAG_TOOTS, config_1.config.trending.tags);
}
exports.getRecentTootsForTrendingTags = getRecentTootsForTrendingTags;
;
// Get toots for a list of tags, caching the results
async function getCacheableTootsForTags(tags, cacheKey, cfg) {
    return await api_1.default.instance.getCacheableToots(async () => await api_1.default.instance.getStatusesForTags(tags, cfg.numTootsPerTag), cacheKey, cfg.maxToots);
}
// Remove tags that match any of the keywords
function removeKeywordsFromTags(tags, keywords, logPrefix) {
    keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
    const validTags = tags.filter(tag => !keywords.includes(tag.name));
    if (validTags.length != tags.length) {
        (0, log_helpers_1.traceLog)(`${logPrefix} Filtered out ${tags.length - validTags.length} tags:`, tags);
    }
    return validTags;
}
;
//# sourceMappingURL=hashtags.js.map