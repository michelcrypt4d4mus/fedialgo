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
const types_1 = require("../types");
// Get toots for hashtags the user has favourited a lot
async function getFavouritedTagToots() {
    const participatedTags = (await tag_list_1.default.fromParticipated()).tagNameDict();
    const tagList = await tag_list_1.default.fromFavourites();
    await tagList.removeFollowedAndMutedTags();
    await tagList.removeTrendingTags();
    tagList.removeInvalidTrendingTags();
    // Filter out tags that have high participation by the fedialgo user
    // TODO: make this a config value or (better) a heuristic based on the data
    tagList.tags = tagList.tags.filter((tag) => !((participatedTags[tag.name]?.numToots || 0) >= 2));
    return await getCacheableTootsForTags(tagList, types_1.CacheKey.FAVOURITED_HASHTAG_TOOTS);
}
exports.getFavouritedTagToots = getFavouritedTagToots;
;
// Get recent toots from hashtags the user has participated in frequently
async function getParticipatedHashtagToots() {
    const tagList = await tag_list_1.default.fromParticipated();
    await tagList.removeFollowedAndMutedTags();
    await tagList.removeTrendingTags();
    return await getCacheableTootsForTags(tagList, types_1.CacheKey.PARTICIPATED_TAG_TOOTS);
}
exports.getParticipatedHashtagToots = getParticipatedHashtagToots;
;
// Get toots for the top trending tags via the search endpoint.
async function getRecentTootsForTrendingTags() {
    const tagList = await tag_list_1.default.fromTrending();
    return await getCacheableTootsForTags(tagList, types_1.CacheKey.TRENDING_TAG_TOOTS);
}
exports.getRecentTootsForTrendingTags = getRecentTootsForTrendingTags;
;
// Get toots for a list of tags, caching the results
async function getCacheableTootsForTags(tagList, cacheKey) {
    return await api_1.default.instance.getCacheableToots(async () => await api_1.default.instance.getStatusesForTags(tagList.topTags(), tagList.tootsConfig.numTootsPerTag), cacheKey, tagList.tootsConfig.maxToots);
}
;
//# sourceMappingURL=hashtags.js.map