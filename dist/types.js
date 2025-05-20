"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaCategory = exports.FEDIVERSE_KEYS = exports.StorageKey = exports.TRENDING_WEIGHTS = exports.NON_SCORE_WEIGHTS = exports.WeightName = void 0;
// Names of the user adjustable score weightings
var WeightName;
(function (WeightName) {
    WeightName["ALREADY_SHOWN"] = "AlreadyShown";
    WeightName["CHAOS"] = "Chaos";
    WeightName["DIVERSITY"] = "Diversity";
    WeightName["FAVOURITED_ACCOUNTS"] = "FavouritedAccounts";
    WeightName["FAVOURITED_TAGS"] = "FavouritedTags";
    WeightName["FOLLOWED_TAGS"] = "FollowedTags";
    WeightName["IMAGE_ATTACHMENTS"] = "ImageAttachments";
    WeightName["INTERACTIONS"] = "Interactions";
    WeightName["MENTIONS_FOLLOWED"] = "MentionsFollowed";
    WeightName["MOST_REPLIED_ACCOUNTS"] = "MostRepliedAccounts";
    WeightName["MOST_RETOOTED_ACCOUNTS"] = "MostRetootedAccounts";
    WeightName["NUM_FAVOURITES"] = "NumFavourites";
    WeightName["NUM_REPLIES"] = "NumReplies";
    WeightName["NUM_RETOOTS"] = "NumRetoots";
    WeightName["PARTICIPATED_TAGS"] = "ParticipatedTags";
    WeightName["RETOOTED_IN_FEED"] = "RetootedInFeed";
    WeightName["TRENDING_LINKS"] = "TrendingLinks";
    WeightName["TRENDING_TAGS"] = "TrendingTags";
    WeightName["TRENDING_TOOTS"] = "TrendingToots";
    WeightName["VIDEO_ATTACHMENTS"] = "VideoAttachments";
    // Non score weights
    WeightName["OUTLIER_DAMPENER"] = "OutlierDampener";
    WeightName["TIME_DECAY"] = "TimeDecay";
    WeightName["TRENDING"] = "Trending";
})(WeightName || (exports.WeightName = WeightName = {}));
;
// Order matters for the demo app
exports.NON_SCORE_WEIGHTS = [
    WeightName.TIME_DECAY,
    WeightName.TRENDING,
    WeightName.OUTLIER_DAMPENER,
];
exports.TRENDING_WEIGHTS = [
    WeightName.TRENDING_LINKS,
    WeightName.TRENDING_TAGS,
    WeightName.TRENDING_TOOTS,
];
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