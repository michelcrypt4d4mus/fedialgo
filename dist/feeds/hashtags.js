"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeMutedTags = exports.getRecentTootsForTrendingTags = exports.getParticipatedHashtagToots = exports.getFavouritedTagToots = void 0;
/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
const api_1 = __importDefault(require("../api/api"));
const mastodon_server_1 = __importDefault(require("../api/mastodon_server"));
const tag_list_1 = __importDefault(require("../api/objects/tag_list"));
const user_data_1 = __importDefault(require("../api/user_data"));
const string_helpers_1 = require("../helpers/string_helpers");
const types_1 = require("../types");
const config_1 = require("../config");
const log_helpers_1 = require("../helpers/log_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
// Get toots for hashtags the user has favourited a lot
async function getFavouritedTagToots() {
    const logPrefix = (0, string_helpers_1.bracketed)(types_1.CacheKey.FAVOURITED_HASHTAG_TOOTS);
    const favouritedTags = await tag_list_1.default.fromFavourites();
    const followedTags = (await tag_list_1.default.fromFollowedTags()).tagNameDict();
    const participatedTags = (await tag_list_1.default.fromParticipated()).tagNameDict();
    // Filter out tags that are already followed or have high participation by the fedialgo user
    let tags = favouritedTags.tags.filter((tag) => {
        if (config_1.config.trending.tags.invalidTrendingTags.includes(tag.name)) {
            return false;
        }
        else if (tag.name in followedTags) {
            return false;
        }
        else if ((participatedTags[tag.name]?.numToots || 0) >= 2) { // TODO: make this a config value or (better) a heuristic based on the data
            return false;
        }
        else {
            return true;
        }
    });
    tags = await removeTrendingTags(tags, logPrefix);
    tags = (new tag_list_1.default(tags)).topTags(config_1.config.favouritedTags.numTags);
    (0, log_helpers_1.traceLog)(`${logPrefix} Using tags:\n   ` + tags.map(tag => `${tag.name} (${tag.numToots} faves)`).join("\n   "));
    return await getCacheableTootsForTags(tags, types_1.CacheKey.FAVOURITED_HASHTAG_TOOTS, config_1.config.favouritedTags);
}
exports.getFavouritedTagToots = getFavouritedTagToots;
;
// Get recent toots from hashtags the user has participated in frequently
async function getParticipatedHashtagToots() {
    const logPrefix = (0, string_helpers_1.bracketed)(types_1.CacheKey.PARTICIPATED_TAG_TOOTS);
    let tags = await user_data_1.default.getUserParticipatedTagsSorted();
    tags = await removeFollowedAndMutedTags(tags);
    tags = await removeTrendingTags(tags, logPrefix);
    tags = (0, collection_helpers_1.truncateToConfiguredLength)(tags, config_1.config.participatedTags.numTags, logPrefix);
    console.debug(`${logPrefix} Gettings toots for participated tags:`, tags);
    return await getCacheableTootsForTags(tags, types_1.CacheKey.PARTICIPATED_TAG_TOOTS, config_1.config.participatedTags);
}
exports.getParticipatedHashtagToots = getParticipatedHashtagToots;
;
// Get toots for the top trending tags via the search endpoint.
async function getRecentTootsForTrendingTags() {
    let tags = await getTrendingTags();
    return await getCacheableTootsForTags(tags, types_1.CacheKey.TRENDING_TAG_TOOTS, config_1.config.trending.tags);
}
exports.getRecentTootsForTrendingTags = getRecentTootsForTrendingTags;
;
// Screen a list of hashtags against the user's server side filters, removing any that are muted.
async function removeMutedTags(tags) {
    const mutedKeywords = await user_data_1.default.getMutedKeywords();
    return removeKeywordsFromTags(tags, mutedKeywords, "[removeMutedTags()]");
}
exports.removeMutedTags = removeMutedTags;
;
// Get toots for a list of tags, caching the results
async function getCacheableTootsForTags(tags, cacheKey, cfg) {
    return await api_1.default.instance.getCacheableToots(async () => await api_1.default.instance.getStatusesForTags(tags, cfg.numTootsPerTag), cacheKey, cfg.maxToots);
}
// Get the trending tags across the fediverse
// TODO: stripping out followed/muted tags here can result in less than Config.trending.tags.numTags tags
async function getTrendingTags() {
    const tags = await mastodon_server_1.default.fediverseTrendingTags();
    return await removeFollowedAndMutedTags(tags);
}
;
// Filter out any tags that are muted or followed
async function removeFollowedAndMutedTags(tags) {
    return await removeFollowedTags(await removeMutedTags(tags));
}
;
// Screen a list of hashtags against the user's followed tags, removing any that are followed.
async function removeFollowedTags(tags) {
    const followedKeywords = (await api_1.default.instance.getFollowedTags()).map(t => t.name);
    return removeKeywordsFromTags(tags, followedKeywords, "[removeFollowedTags()]");
}
;
// Remove any trending tags from a list of tags
async function removeTrendingTags(tags, logPrefix) {
    return removeKeywordsFromTags(tags, (await getTrendingTags()).map(t => t.name), logPrefix);
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