"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentTootsForTrendingTags = exports.getParticipatedHashtagToots = void 0;
/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
const api_1 = __importDefault(require("../api/api"));
const mastodon_server_1 = __importDefault(require("../api/mastodon_server"));
const user_data_1 = __importDefault(require("../api/user_data"));
const config_1 = require("../config");
const types_1 = require("../types");
const log_helpers_1 = require("../helpers/log_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
// Get recent toots from hashtags the user has participated in frequently
async function getParticipatedHashtagToots() {
    let tags = await user_data_1.default.getUserParticipatedHashtagsSorted();
    tags = await removeFollowedAndMutedTags(tags);
    tags = (0, collection_helpers_1.truncateToConfiguredLength)(tags, "numParticipatedTagsToFetchTootsFor");
    return await api_1.default.instance.getCacheableToots(types_1.StorageKey.PARTICIPATED_TAG_TOOTS, async () => await api_1.default.instance.getStatusesForTags(tags, config_1.Config.numParticipatedTagTootsPerTag), "numParticipatedTagToots");
}
exports.getParticipatedHashtagToots = getParticipatedHashtagToots;
;
// Get toots for the top trending tags via the search endpoint.
async function getRecentTootsForTrendingTags() {
    let tags = await mastodon_server_1.default.fediverseTrendingTags();
    // TODO: stripping out followed/muted tags here can result in less than Config.numTrendingTags tags
    tags = await removeFollowedAndMutedTags(tags);
    return await api_1.default.instance.getCacheableToots(types_1.StorageKey.TRENDING_TAG_TOOTS, async () => await api_1.default.instance.getStatusesForTags(tags, config_1.Config.numTootsPerTrendingTag), "numTrendingTagsToots");
}
exports.getRecentTootsForTrendingTags = getRecentTootsForTrendingTags;
;
// Filter out any tags that are muted or followed
async function removeFollowedAndMutedTags(tags) {
    return await removeFollowedTags(await removeMutedTags(tags));
}
;
// Screen a list of hashtags against the user's server side filters, removing any that are muted.
async function removeMutedTags(tags) {
    const mutedKeywords = await user_data_1.default.mutedKeywords();
    return removeKeywordsFromTags(tags, mutedKeywords, "[removeMutedTags()]");
}
;
// Screen a list of hashtags against the user's followed tags, removing any that are followed.
async function removeFollowedTags(tags) {
    const followedKeywords = (await api_1.default.instance.getFollowedTags()).map(t => t.name);
    return removeKeywordsFromTags(tags, followedKeywords, "[removeFollowedTags()]");
}
;
function removeKeywordsFromTags(tags, keywords, logPrefix) {
    const validTags = tags.filter(tag => !keywords.includes(tag.name));
    if (validTags.length != tags.length) {
        (0, log_helpers_1.traceLog)(`${logPrefix} Filtered out ${tags.length - validTags.length} tags:`, tags);
    }
    return validTags;
}
;
//# sourceMappingURL=hashtags.js.map