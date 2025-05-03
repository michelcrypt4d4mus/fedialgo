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
const types_1 = require("../types");
const collection_helpers_1 = require("../helpers/collection_helpers");
// Get recent toots from hashtags the user has participated in frequently
async function getParticipatedHashtagToots() {
    return await api_1.default.instance.getCacheableToots(types_1.StorageKey.PARTICIPATED_TAG_TOOTS, async () => {
        let tags = await user_data_1.default.getPostedHashtagsSorted();
        // Exclude followed tags from the list (they will show up in the timeline on their own)
        const followedTags = await api_1.default.instance.getFollowedTags();
        tags = tags.filter(t => !followedTags.some(f => f.name == t.name));
        tags = (0, collection_helpers_1.truncateToConfiguredLength)(tags, "numUserParticipatedTagsToFetchTootsFor");
        console.debug(`[getParticipatedHashtagToots] Fetching toots for tags:`, tags);
        return await api_1.default.instance.getStatusesForTags(tags);
    }, "numUserParticipatedTagToots");
}
exports.getParticipatedHashtagToots = getParticipatedHashtagToots;
// Get toots for the top trending tags via the search endpoint.
async function getRecentTootsForTrendingTags() {
    return await api_1.default.instance.getCacheableToots(types_1.StorageKey.TRENDING_TAG_TOOTS, async () => api_1.default.instance.getStatusesForTags(await mastodon_server_1.default.fediverseTrendingTags()), "numTrendingTagsToots");
}
exports.getRecentTootsForTrendingTags = getRecentTootsForTrendingTags;
;
//# sourceMappingURL=hashtags.js.map