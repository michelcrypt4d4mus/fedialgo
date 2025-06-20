"use strict";
/**
 * Enums (and a few enum related helper methods and constsants) used by FediAlgo.
 * @module enums
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWeightName = exports.isTypeFilterName = exports.isScoreName = exports.isNonScoreWeightName = exports.isTagTootsCacheKey = exports.isCacheKey = exports.isValueInStringEnum = exports.simpleCacheKeyDict = exports.buildCacheKeyDict = exports.TOOT_SOURCES = exports.ALL_CACHE_KEYS = exports.UNIQUE_ID_PROPERTIES = exports.STORAGE_KEYS_WITH_TOOTS = exports.STORAGE_KEYS_WITH_ACCOUNTS = exports.ALL_ACTIONS = exports.TypeFilterName = exports.BooleanFilterName = exports.TrendingType = exports.MediaCategory = exports.ScoreName = exports.NonScoreWeightName = exports.TagTootsCategory = exports.FediverseCacheKey = exports.CacheKey = exports.AlgorithmStorageKey = exports.LogAction = exports.LoadAction = void 0;
/**
 * Actions that TheAlgorithm can take.
 * @enum {string}
 * @private
 */
var LoadAction;
(function (LoadAction) {
    LoadAction["FEED_UPDATE"] = "triggerFeedUpdate";
    LoadAction["GET_CONVERSATION"] = "conversation";
    LoadAction["GET_MOAR_DATA"] = "triggerMoarData";
    LoadAction["IS_BUSY"] = "isBusy";
    LoadAction["PULL_ALL_USER_DATA"] = "triggerPullAllUserData";
    LoadAction["REFRESH_MUTED_ACCOUNTS"] = "refreshMutedAccounts";
    LoadAction["RESET"] = "reset";
    LoadAction["TIMELINE_BACKFILL"] = "triggerTimelineBackfill";
})(LoadAction || (exports.LoadAction = LoadAction = {}));
;
var LogAction;
(function (LogAction) {
    LogAction["FINISH_FEED_UPDATE"] = "finishFeedUpdate";
    LogAction["INITIAL_LOADING_STATUS"] = "initialState";
})(LogAction || (exports.LogAction = LogAction = {}));
;
/**
 * Enum of storage keys for user data and app state and other things not directly tied to API calls.
 * @private
 * @enum {string}
 */
var AlgorithmStorageKey;
(function (AlgorithmStorageKey) {
    AlgorithmStorageKey["APP_OPENS"] = "AppOpens";
    AlgorithmStorageKey["FILTERS"] = "Filters";
    AlgorithmStorageKey["TIMELINE_TOOTS"] = "TimelineToots";
    AlgorithmStorageKey["USER"] = "FedialgoUser";
    AlgorithmStorageKey["WEIGHTS"] = "Weights";
})(AlgorithmStorageKey || (exports.AlgorithmStorageKey = AlgorithmStorageKey = {}));
;
/**
 * Enum of keys used to cache Mastodon API data in the browser's IndexedDB via localForage.
 * Keys that contain Toots should end with "_TOOTS", likewise for Account objects with "_ACCOUNTS".
 * Used for Storage and cache management.
 * @private
 * @enum {string}
 */
var CacheKey;
(function (CacheKey) {
    CacheKey["BLOCKED_ACCOUNTS"] = "BlockedAccounts";
    CacheKey["BLOCKED_DOMAINS"] = "BlockedDomains";
    CacheKey["FAVOURITED_TOOTS"] = "FavouritedToots";
    CacheKey["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    CacheKey["FOLLOWED_TAGS"] = "FollowedTags";
    CacheKey["FOLLOWERS"] = "Followers";
    CacheKey["HASHTAG_TOOTS"] = "HashtagToots";
    CacheKey["HOME_TIMELINE_TOOTS"] = "HomeTimelineToots";
    CacheKey["HOMESERVER_TOOTS"] = "HomeserverToots";
    CacheKey["INSTANCE_INFO"] = "InstanceInfo";
    CacheKey["MUTED_ACCOUNTS"] = "MutedAccounts";
    CacheKey["NOTIFICATIONS"] = "Notifications";
    CacheKey["RECENT_USER_TOOTS"] = "RecentUserToots";
    CacheKey["SERVER_SIDE_FILTERS"] = "ServerFilters";
})(CacheKey || (exports.CacheKey = CacheKey = {}));
;
/**
 * Enum of cache keys for the fediverse wide trending data.
 * @private
 * @enum {string}
 */
var FediverseCacheKey;
(function (FediverseCacheKey) {
    FediverseCacheKey["FEDIVERSE_POPULAR_SERVERS"] = "FediversePopularServers";
    FediverseCacheKey["FEDIVERSE_TRENDING_TAGS"] = "FediverseTrendingTags";
    FediverseCacheKey["FEDIVERSE_TRENDING_LINKS"] = "FediverseTrendingLinks";
    FediverseCacheKey["FEDIVERSE_TRENDING_TOOTS"] = "FediverseTrendingToots";
})(FediverseCacheKey || (exports.FediverseCacheKey = FediverseCacheKey = {}));
;
/**
 * Enum of categories of toots pulled for a type of tag (favourited/particated/trending).
 * @enum {string}
 */
var TagTootsCategory;
(function (TagTootsCategory) {
    TagTootsCategory["FAVOURITED"] = "FavouritedHashtagToots";
    TagTootsCategory["PARTICIPATED"] = "ParticipatedHashtagToots";
    TagTootsCategory["TRENDING"] = "TrendingTagToots";
})(TagTootsCategory || (exports.TagTootsCategory = TagTootsCategory = {}));
;
/**
 * Enum of non-score weight names (used for sliders and scoring adjustments).
 * Order influences the order of the score weighting sliders in the demo app.
 * @enum {string}
 */
var NonScoreWeightName;
(function (NonScoreWeightName) {
    NonScoreWeightName["TIME_DECAY"] = "TimeDecay";
    NonScoreWeightName["TRENDING"] = "Trending";
    NonScoreWeightName["OUTLIER_DAMPENER"] = "OutlierDampener";
})(NonScoreWeightName || (exports.NonScoreWeightName = NonScoreWeightName = {}));
;
/**
 * Enum of all scoring categories for which there is a scorer. Also Used for UI display and filtering.
 * @enum {string}
 */
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
/**
 * Enum of Mastodon API media category strings.
 * @enum {string}
 */
var MediaCategory;
(function (MediaCategory) {
    MediaCategory["AUDIO"] = "audio";
    MediaCategory["IMAGE"] = "image";
    MediaCategory["VIDEO"] = "video";
})(MediaCategory || (exports.MediaCategory = MediaCategory = {}));
;
/**
 * Enum of trending data types that can be fetched from the API. *
 * @enum {string}
 */
var TrendingType;
(function (TrendingType) {
    TrendingType["LINKS"] = "links";
    TrendingType["SERVERS"] = "servers";
    TrendingType["STATUSES"] = "statuses";
    TrendingType["TAGS"] = "tags";
})(TrendingType || (exports.TrendingType = TrendingType = {}));
;
/**
 * Enum of boolean filter names for filtering toots by property.
 * @enum {string}
 */
var BooleanFilterName;
(function (BooleanFilterName) {
    BooleanFilterName["APP"] = "app";
    BooleanFilterName["HASHTAG"] = "hashtag";
    BooleanFilterName["LANGUAGE"] = "language";
    BooleanFilterName["SERVER"] = "server";
    BooleanFilterName["TYPE"] = "type";
    BooleanFilterName["USER"] = "user";
})(BooleanFilterName || (exports.BooleanFilterName = BooleanFilterName = {}));
;
/**
 * Enum of type filter names for filtering toots by type (e.g., audio, bot, images, etc.).
 * The values have spaces for better presentation in the demo app.
 * @enum {string}
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
///////////////////////////
//      Constants        //
///////////////////////////
exports.ALL_ACTIONS = [
    ...Object.values(LoadAction),
    ...Object.values(LogAction),
];
// Objects fetched with these keys need to be built into proper Account objects.
exports.STORAGE_KEYS_WITH_ACCOUNTS = Object.entries(CacheKey).reduce((keys, [k, v]) => (k.endsWith('_ACCOUNTS')) ? keys.concat(v) : keys, [CacheKey.FOLLOWERS]);
// Objects fetched with these keys need to be built into proper Toot objects.
exports.STORAGE_KEYS_WITH_TOOTS = Object.entries(CacheKey).reduce((keys, [k, v]) => k.endsWith('_TOOTS') ? keys.concat(v) : keys, [
    AlgorithmStorageKey.TIMELINE_TOOTS,
    FediverseCacheKey.FEDIVERSE_TRENDING_TOOTS
]).concat(Object.values(TagTootsCategory));
// The property that can be used to uniquely identify objects stored at that ApiCacheKey.
exports.UNIQUE_ID_PROPERTIES = {
    ...exports.STORAGE_KEYS_WITH_TOOTS.reduce((dict, key) => {
        dict[key] = 'uri';
        return dict;
    }, {}),
    ...exports.STORAGE_KEYS_WITH_ACCOUNTS.reduce((dict, key) => {
        dict[key] = 'webfingerURI'; // Accounts have a 'webfingerURI' property
        return dict;
    }, {}),
    [CacheKey.FOLLOWED_TAGS]: 'name',
    [CacheKey.NOTIFICATIONS]: 'id',
    [CacheKey.SERVER_SIDE_FILTERS]: 'id', // Filters have an 'id' property
};
exports.ALL_CACHE_KEYS = [
    ...Object.values(CacheKey),
    ...Object.values(FediverseCacheKey),
    ...Object.values(TagTootsCategory),
];
exports.TOOT_SOURCES = [
    ...exports.STORAGE_KEYS_WITH_TOOTS,
    LoadAction.GET_CONVERSATION,
    LoadAction.REFRESH_MUTED_ACCOUNTS,
];
/**
 * Build a dictionary of values for each ApiCacheKey using the provided function.
 * @private
 * @template K
 * @template T
 * @param {(key?: ApiCacheKey) => T} fxn - Function to generate a value for each key.
 * @param {Record<K, T>} [initialDict] - Optional initial dictionary to extend (default={}).
 * @param {ApiCacheKey[]} [keys] - Optional list of keys to use (defaults to ALL_CACHE_KEYS).
 * @returns {Record<ApiCacheKey, T>} Dictionary of values by cache key.
 */
function buildCacheKeyDict(fxn, initialDict, keys) {
    return (keys ?? exports.ALL_CACHE_KEYS).reduce((dict, key) => {
        dict[key] = fxn(key);
        return dict;
    }, (initialDict ?? {}));
}
exports.buildCacheKeyDict = buildCacheKeyDict;
;
// Generate a dict with all ApiCacheKeys as keys and a whatever fxn() returns as values.
function simpleCacheKeyDict(fxn, keys) {
    return buildCacheKeyDict(fxn, null, keys);
}
exports.simpleCacheKeyDict = simpleCacheKeyDict;
;
/**
 * Generate a function to check if a value exists in a string enum.
 * @template E
 * @param {Record<string, E>} strEnum - The enum object.
 * @returns {(value: string) => boolean} The checker function.
 */
function isValueInStringEnum(strEnum) {
    const enumValues = new Set(Object.values(strEnum));
    return (str) => enumValues.has(str);
}
exports.isValueInStringEnum = isValueInStringEnum;
;
/** True if argument is a member of CacheKey. */
exports.isCacheKey = isValueInStringEnum(CacheKey);
/** True if argument is a member of TagTootsCacheKey. */
exports.isTagTootsCacheKey = isValueInStringEnum(TagTootsCategory);
/** True if argument is a member of NonScoreWeightName enum. */
exports.isNonScoreWeightName = isValueInStringEnum(NonScoreWeightName);
/** True if argument is a member of ScoreName enum. */
exports.isScoreName = isValueInStringEnum(ScoreName);
/** True if argument is a member of TypeFilterName enum. */
exports.isTypeFilterName = isValueInStringEnum(TypeFilterName);
/** True if argument is a member of ScoreName or NonScoreWeightName enums. */
const isWeightName = (str) => (0, exports.isScoreName)(str) || (0, exports.isNonScoreWeightName)(str);
exports.isWeightName = isWeightName;
//# sourceMappingURL=enums.js.map