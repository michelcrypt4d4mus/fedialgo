"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaCategory = exports.FEDIVERSE_KEYS = exports.StorageKey = exports.NonScoreWeightName = exports.ScoreName = void 0;
var ScoreName;
(function (ScoreName) {
    ScoreName["ALREADY_SHOWN"] = "AlreadyShown";
    ScoreName["CHAOS"] = "Chaos";
    ScoreName["DIVERSITY"] = "Diversity";
    ScoreName["FAVOURITED_ACCOUNTS"] = "FavouritedAccounts";
    ScoreName["FAVOURITED_TAGS"] = "FavouritedTags";
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
var NonScoreWeightName;
(function (NonScoreWeightName) {
    NonScoreWeightName["TIME_DECAY"] = "TimeDecay";
    NonScoreWeightName["TRENDING"] = "Trending";
    NonScoreWeightName["OUTLIER_DAMPENER"] = "OutlierDampener";
})(NonScoreWeightName || (exports.NonScoreWeightName = NonScoreWeightName = {}));
;
// Keys that are valid for local browser storage.
var StorageKey;
(function (StorageKey) {
    StorageKey["APP_OPENS"] = "AppOpens";
    StorageKey["BLOCKED_ACCOUNTS"] = "BlockedAccounts";
    StorageKey["FAVOURITED_TOOTS"] = "FavouritedToots";
    StorageKey["FEDIVERSE_POPULAR_SERVERS"] = "FediversePopularServers";
    StorageKey["FEDIVERSE_TRENDING_TAGS"] = "FediverseTrendingTags";
    StorageKey["FEDIVERSE_TRENDING_LINKS"] = "FediverseTrendingLinks";
    StorageKey["FEDIVERSE_TRENDING_TOOTS"] = "FediverseTrendingToots";
    StorageKey["FILTERS"] = "Filters";
    StorageKey["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    StorageKey["FOLLOWED_TAGS"] = "FollowedTags";
    StorageKey["HASHTAG_TOOTS"] = "HashtagToots";
    StorageKey["HOME_TIMELINE"] = "HomeTimeline";
    StorageKey["MUTED_ACCOUNTS"] = "MutedAccounts";
    StorageKey["NOTIFICATIONS"] = "Notifications";
    StorageKey["PARTICIPATED_TAG_TOOTS"] = "ParticipatedHashtagToots";
    StorageKey["RECENT_USER_TOOTS"] = "RecentUserToots";
    StorageKey["SERVER_SIDE_FILTERS"] = "ServerFilters";
    StorageKey["TIMELINE"] = "Timeline";
    StorageKey["TRENDING_TAG_TOOTS"] = "TrendingTagToots";
    StorageKey["USER"] = "FedialgoUser";
    StorageKey["WEIGHTS"] = "Weights";
})(StorageKey || (exports.StorageKey = StorageKey = {}));
;
exports.FEDIVERSE_KEYS = [
    StorageKey.FEDIVERSE_POPULAR_SERVERS,
    StorageKey.FEDIVERSE_TRENDING_LINKS,
    StorageKey.FEDIVERSE_TRENDING_TAGS,
    StorageKey.FEDIVERSE_TRENDING_TOOTS,
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