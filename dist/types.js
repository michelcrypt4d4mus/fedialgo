"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaCategory = exports.FEDIVERSE_KEYS = exports.AlgorithmStorageKey = exports.CacheKey = exports.NonScoreWeightName = exports.ScoreName = void 0;
var ScoreName;
(function (ScoreName) {
    ScoreName["ALREADY_SHOWN"] = "AlreadyShown";
    ScoreName["CHAOS"] = "Chaos";
    ScoreName["DIVERSITY"] = "Diversity";
    ScoreName["FAVOURITED_ACCOUNTS"] = "FavouritedAccounts";
    ScoreName["FAVOURITED_TAGS"] = "FavouritedTags";
    ScoreName["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    ScoreName["FOLLOWED_TAGS"] = "FollowedTags";
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
// Order currently influences the order of the score weighting sliders in the demo app
var NonScoreWeightName;
(function (NonScoreWeightName) {
    NonScoreWeightName["TIME_DECAY"] = "TimeDecay";
    NonScoreWeightName["TRENDING"] = "Trending";
    NonScoreWeightName["OUTLIER_DAMPENER"] = "OutlierDampener";
})(NonScoreWeightName || (exports.NonScoreWeightName = NonScoreWeightName = {}));
;
// Keys that are valid for local browser storage.
var CacheKey;
(function (CacheKey) {
    CacheKey["BLOCKED_ACCOUNTS"] = "BlockedAccounts";
    CacheKey["FAVOURITED_TOOTS"] = "FavouritedToots";
    CacheKey["FAVOURITED_HASHTAG_TOOTS"] = "FavouritedHashtagToots";
    CacheKey["FEDIVERSE_POPULAR_SERVERS"] = "FediversePopularServers";
    CacheKey["FEDIVERSE_TRENDING_TAGS"] = "FediverseTrendingTags";
    CacheKey["FEDIVERSE_TRENDING_LINKS"] = "FediverseTrendingLinks";
    CacheKey["FEDIVERSE_TRENDING_TOOTS"] = "FediverseTrendingToots";
    CacheKey["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    CacheKey["FOLLOWED_TAGS"] = "FollowedTags";
    CacheKey["HASHTAG_TOOTS"] = "HashtagToots";
    CacheKey["HOME_TIMELINE"] = "HomeTimeline";
    CacheKey["MUTED_ACCOUNTS"] = "MutedAccounts";
    CacheKey["NOTIFICATIONS"] = "Notifications";
    CacheKey["PARTICIPATED_TAG_TOOTS"] = "ParticipatedHashtagToots";
    CacheKey["RECENT_USER_TOOTS"] = "RecentUserToots";
    CacheKey["SERVER_SIDE_FILTERS"] = "ServerFilters";
    CacheKey["TIMELINE"] = "Timeline";
    CacheKey["TRENDING_TAG_TOOTS"] = "TrendingTagToots";
})(CacheKey || (exports.CacheKey = CacheKey = {}));
;
var AlgorithmStorageKey;
(function (AlgorithmStorageKey) {
    AlgorithmStorageKey["APP_OPENS"] = "AppOpens";
    AlgorithmStorageKey["FILTERS"] = "Filters";
    AlgorithmStorageKey["USER"] = "FedialgoUser";
    AlgorithmStorageKey["WEIGHTS"] = "Weights";
})(AlgorithmStorageKey || (exports.AlgorithmStorageKey = AlgorithmStorageKey = {}));
;
exports.FEDIVERSE_KEYS = [
    CacheKey.FEDIVERSE_POPULAR_SERVERS,
    CacheKey.FEDIVERSE_TRENDING_LINKS,
    CacheKey.FEDIVERSE_TRENDING_TAGS,
    CacheKey.FEDIVERSE_TRENDING_TOOTS,
];
// Self explanatory
var MediaCategory;
(function (MediaCategory) {
    MediaCategory["AUDIO"] = "audio";
    MediaCategory["IMAGE"] = "image";
    MediaCategory["VIDEO"] = "video";
})(MediaCategory || (exports.MediaCategory = MediaCategory = {}));
;
;
;
;
;
;
;
;
;
// TODO: unused stuff below here
// From https://dev.to/nikosanif/create-promises-with-timeout-error-in-typescript-fmm
function promiseWithTimeout(promise, milliseconds, timeoutError = new Error('Promise timed out')) {
    // create a promise that rejects in milliseconds
    const timeout = new Promise((_, reject) => {
        setTimeout(() => {
            reject(timeoutError);
        }, milliseconds);
    });
    // returns a race between timeout and the passed promise
    return Promise.race([promise, timeout]);
}
;
//# sourceMappingURL=types.js.map