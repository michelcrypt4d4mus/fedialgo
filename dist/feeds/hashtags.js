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
const config_1 = require("../config");
const types_1 = require("../types");
const log_helpers_1 = require("../helpers/log_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
async function getFavouritedTagToots() {
    const logPrefix = (0, string_helpers_1.bracketed)("getFavouritedHashtagToots()");
    const favouritedTags = await tag_list_1.default.fromFavourites();
    const followedTags = (await tag_list_1.default.fromFollowedTags()).tagNameDict();
    const participatedTags = (await tag_list_1.default.fromParticipated()).tagNameDict();
    console.debug(`${logPrefix} followedTags:`, followedTags);
    console.debug(`${logPrefix} participatedTags:`, participatedTags);
    // Filter out tags that are followed or have low participation by the fedialgo user
    const favouritedNonParticipatedTags = favouritedTags.tags.filter((tag) => {
        let isValid = true;
        if (config_1.config.trending.tags.invalidTrendingTags.includes(tag.name)) {
            isValid = false;
        }
        else if (tag.name in followedTags) {
            isValid = false;
        }
        else if ((participatedTags[tag.name]?.numToots || 0) >= 2) { // TODO: make this a config value
            isValid = false;
        }
        console.debug(`${logPrefix} Check favourited tag: ${tag.name} (isValid=${isValid}, ${tag.numToots} faves)\nfollowedTags entry:`, followedTags[tag.name], "\nparticipatedTags entry:", participatedTags[tag.name]);
        return isValid;
    });
    console.debug(`${logPrefix} ${favouritedNonParticipatedTags.length} of ${favouritedTags.tags.length} favourited tags not followed/participated`);
    const topFavouritedTags = (new tag_list_1.default(favouritedNonParticipatedTags)).topTags(config_1.config.favouritedTags.numTags);
    topFavouritedTags.forEach((tag, i) => {
        (0, log_helpers_1.traceLog)(`${logPrefix} Favourited not followed/participated tag ${i}: ${tag.name} (${tag.numToots} faves)`);
    });
    return await api_1.default.instance.getCacheableToots(async () => await api_1.default.instance.getStatusesForTags(topFavouritedTags, config_1.config.favouritedTags.numTootsPerTag), types_1.CacheKey.FAVOURITED_HASHTAG_TOOTS, config_1.config.favouritedTags.maxToots);
}
exports.getFavouritedTagToots = getFavouritedTagToots;
;
// Get recent toots from hashtags the user has participated in frequently
async function getParticipatedHashtagToots() {
    const logPrefix = (0, string_helpers_1.bracketed)("getParticipatedHashtagToots()");
    let tags = await user_data_1.default.getUserParticipatedTagsSorted();
    tags = await removeFollowedAndMutedTags(tags);
    // Remove trending tags from the list of participated tags (we get them anyways)
    tags = removeKeywordsFromTags(tags, (await getTrendingTags()).map(t => t.name), logPrefix);
    tags = (0, collection_helpers_1.truncateToConfiguredLength)(tags, config_1.config.participatedTags.numTags, logPrefix);
    console.debug(`${logPrefix} Gettings toots for participated tags:`, tags);
    return await api_1.default.instance.getCacheableToots(async () => await api_1.default.instance.getStatusesForTags(tags, config_1.config.participatedTags.numTootsPerTag), types_1.CacheKey.PARTICIPATED_TAG_TOOTS, config_1.config.participatedTags.maxToots);
}
exports.getParticipatedHashtagToots = getParticipatedHashtagToots;
;
// Get toots for the top trending tags via the search endpoint.
async function getRecentTootsForTrendingTags() {
    let tags = await getTrendingTags();
    return await api_1.default.instance.getCacheableToots(async () => await api_1.default.instance.getStatusesForTags(tags, config_1.config.trending.tags.numTootsPerTag), types_1.CacheKey.TRENDING_TAG_TOOTS, config_1.config.trending.tags.maxToots);
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