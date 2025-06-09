"use strict";
/**
 * Enums used by FediAlgo.
 * @module Enums
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValueInStringEnum = exports.buildCacheKeyDict = exports.isTypeFilterName = exports.TypeFilterName = exports.BooleanFilterName = exports.TrendingType = exports.MediaCategory = exports.ScoreName = exports.NonScoreWeightName = exports.AlgorithmStorageKey = exports.ALL_CACHE_KEYS = exports.TagTootsCacheKey = exports.CacheKey = void 0;
/**
 * Enum of keys used to cache Mastodon API data in the browser's IndexedDB via localForage.
 * Keys that contain Toots should end with "_TOOTS", likewise for Account objects with "_ACCOUNTS".
 * Used for Storage and cache management.
 */
var CacheKey;
(function (CacheKey) {
    CacheKey["BLOCKED_ACCOUNTS"] = "BlockedAccounts";
    CacheKey["FAVOURITED_TOOTS"] = "FavouritedToots";
    CacheKey["FEDIVERSE_POPULAR_SERVERS"] = "FediversePopularServers";
    CacheKey["FEDIVERSE_TRENDING_TAGS"] = "FediverseTrendingTags";
    CacheKey["FEDIVERSE_TRENDING_LINKS"] = "FediverseTrendingLinks";
    CacheKey["FEDIVERSE_TRENDING_TOOTS"] = "FediverseTrendingToots";
    CacheKey["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    CacheKey["FOLLOWED_TAGS"] = "FollowedTags";
    CacheKey["FOLLOWERS"] = "Followers";
    CacheKey["HASHTAG_TOOTS"] = "HashtagToots";
    CacheKey["HOME_TIMELINE_TOOTS"] = "HomeTimelineToots";
    CacheKey["MUTED_ACCOUNTS"] = "MutedAccounts";
    CacheKey["NOTIFICATIONS"] = "Notifications";
    CacheKey["RECENT_USER_TOOTS"] = "RecentUserToots";
    CacheKey["SERVER_SIDE_FILTERS"] = "ServerFilters";
    CacheKey["TIMELINE_TOOTS"] = "TimelineToots";
})(CacheKey || (exports.CacheKey = CacheKey = {}));
;
/** Enum of cache keys for hashtag-related Toot lists. */
var TagTootsCacheKey;
(function (TagTootsCacheKey) {
    TagTootsCacheKey["FAVOURITED_TAG_TOOTS"] = "FavouritedHashtagToots";
    TagTootsCacheKey["PARTICIPATED_TAG_TOOTS"] = "ParticipatedHashtagToots";
    TagTootsCacheKey["TRENDING_TAG_TOOTS"] = "TrendingTagToots";
})(TagTootsCacheKey || (exports.TagTootsCacheKey = TagTootsCacheKey = {}));
;
/** Array of all cache keys (CacheKey and TagTootsCacheKey values). */
exports.ALL_CACHE_KEYS = [...Object.values(CacheKey), ...Object.values(TagTootsCacheKey)];
/** Enum of storage keys for user data and app state (not API cache). */
var AlgorithmStorageKey;
(function (AlgorithmStorageKey) {
    AlgorithmStorageKey["APP_OPENS"] = "AppOpens";
    AlgorithmStorageKey["FILTERS"] = "Filters";
    AlgorithmStorageKey["USER"] = "FedialgoUser";
    AlgorithmStorageKey["WEIGHTS"] = "Weights";
})(AlgorithmStorageKey || (exports.AlgorithmStorageKey = AlgorithmStorageKey = {}));
;
/**
 * Enum of non-score weight names (used for sliders and scoring adjustments).
 * Order influences the order of the score weighting sliders in the demo app.
 */
var NonScoreWeightName;
(function (NonScoreWeightName) {
    NonScoreWeightName["TIME_DECAY"] = "TimeDecay";
    NonScoreWeightName["TRENDING"] = "Trending";
    NonScoreWeightName["OUTLIER_DAMPENER"] = "OutlierDampener";
})(NonScoreWeightName || (exports.NonScoreWeightName = NonScoreWeightName = {}));
;
/** Enum of all scoring categories for which there is a scorer. Also Used for UI display and filtering. */
var ScoreName;
(function (ScoreName) {
    ScoreName["ALREADY_SHOWN"] = "AlreadyShown";
    ScoreName["AUTHOR_FOLLOWERS"] = "AuthorFollowers";
    ScoreName["CHAOS"] = "Chaos";
    ScoreName["DIVERSITY"] = "Diversity";
    ScoreName["FAVOURITED_ACCOUNTS"] = "FavouritedAccounts";
    ScoreName["FAVOURITED_TAGS"] = "FavouritedTags";
    ScoreName["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    ScoreName["FOLLOWED_TAGS"] = "FollowedTags";
    ScoreName["FOLLOWERS"] = "Followers";
    ScoreName["IMAGE_ATTACHMENTS"] = "ImageAttachments";
    ScoreName["INTERACTIONS"] = "Interactions";
    ScoreName["MENTIONS_FOLLOWED"] = "MentionsFollowed";
    ScoreName["MOST_REPLIED_ACCOUNTS"] = "MostRepliedAccounts";
    ScoreName["MOST_RETOOTED_ACCOUNTS"] = "MostRetootedAccounts";
    ScoreName["NUM_FAVOURITES"] = "NumFavourites";
    ScoreName["NUM_REPLIES"] = "NumReplies";
    ScoreName["NUM_RETOOTS"] = "NumRetoots";
    ScoreName["PARTICIPATED_TAGS"] = "ParticipatedTags";
    ScoreName["RETOOTED_IN_FEED"] = "RetootedInFeed";
    ScoreName["TRENDING_LINKS"] = "TrendingLinks";
    ScoreName["TRENDING_TAGS"] = "TrendingTags";
    ScoreName["TRENDING_TOOTS"] = "TrendingToots";
    ScoreName["VIDEO_ATTACHMENTS"] = "VideoAttachments";
})(ScoreName || (exports.ScoreName = ScoreName = {}));
;
/** Enum of Mastodon API media category strings. */
var MediaCategory;
(function (MediaCategory) {
    MediaCategory["AUDIO"] = "audio";
    MediaCategory["IMAGE"] = "image";
    MediaCategory["VIDEO"] = "video";
})(MediaCategory || (exports.MediaCategory = MediaCategory = {}));
;
/** Enum of trending data types that can be fetched from the API. */
var TrendingType;
(function (TrendingType) {
    TrendingType["LINKS"] = "links";
    TrendingType["SERVERS"] = "servers";
    TrendingType["STATUSES"] = "statuses";
    TrendingType["TAGS"] = "tags";
})(TrendingType || (exports.TrendingType = TrendingType = {}));
;
/** Enum of boolean filter names for filtering toots by property. */
var BooleanFilterName;
(function (BooleanFilterName) {
    BooleanFilterName["HASHTAG"] = "hashtag";
    BooleanFilterName["LANGUAGE"] = "language";
    BooleanFilterName["TYPE"] = "type";
    BooleanFilterName["USER"] = "user";
    BooleanFilterName["APP"] = "app";
})(BooleanFilterName || (exports.BooleanFilterName = BooleanFilterName = {}));
;
/**
 * Enum of type filter names for filtering toots by type (e.g., audio, bot, images, etc.).
 * The values have spaces for better presentation in the demo app.
 */
var TypeFilterName;
(function (TypeFilterName) {
    TypeFilterName["AUDIO"] = "audio";
    TypeFilterName["BOT"] = "bot";
    TypeFilterName["DIRECT_MESSAGE"] = "direct messages";
    TypeFilterName["FOLLOWED_ACCOUNTS"] = "followed accounts";
    TypeFilterName["FOLLOWED_HASHTAGS"] = "followed hashtags";
    TypeFilterName["IMAGES"] = "images";
    TypeFilterName["LINKS"] = "links";
    TypeFilterName["MENTIONS"] = "mentions";
    TypeFilterName["PARTICIPATED_TAGS"] = "participated hashtags";
    TypeFilterName["POLLS"] = "polls";
    TypeFilterName["PRIVATE"] = "private";
    TypeFilterName["REPLIES"] = "replies";
    TypeFilterName["RETOOTS"] = "retoots";
    TypeFilterName["SENSITIVE"] = "sensitive";
    TypeFilterName["SPOILERED"] = "spoilered";
    TypeFilterName["TRENDING_LINKS"] = "trending links";
    TypeFilterName["TRENDING_TAGS"] = "trending hashtags";
    TypeFilterName["TRENDING_TOOTS"] = "trending toots";
    TypeFilterName["VIDEOS"] = "videos";
})(TypeFilterName || (exports.TypeFilterName = TypeFilterName = {}));
;
/** Returns true if string is an element of TypeFilterName enum. */
const isTypeFilterName = (value) => isValueInStringEnum(TypeFilterName)(value);
exports.isTypeFilterName = isTypeFilterName;
/**
 * Build a dictionary of values for each ApiCacheKey using the provided function.
 * @template T
 * @param {(key?: ApiCacheKey) => T} fxn - Function to generate a value for each key.
 * @param {ApiCacheKey[]} [keys] - Optional list of keys to use (defaults to ALL_CACHE_KEYS).
 * @returns {Record<ApiCacheKey, T>} Dictionary of values by cache key.
 */
function buildCacheKeyDict(fxn, keys) {
    return (keys || exports.ALL_CACHE_KEYS).reduce((dict, key) => {
        dict[key] = fxn(key);
        return dict;
    }, {});
}
exports.buildCacheKeyDict = buildCacheKeyDict;
;
/**
 * Generate a function to check if a value exists in a string enum.
 * @template E
 * @param {Record<string, E>} strEnum - The enum object.
 * @returns {(value: string) => value is E} The checker function.
 */
function isValueInStringEnum(strEnum) {
    const enumValues = new Set(Object.values(strEnum));
    return (value) => enumValues.has(value);
}
exports.isValueInStringEnum = isValueInStringEnum;
;
//# sourceMappingURL=enums.js.map