"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaCategory = exports.StorageKey = exports.WeightName = void 0;
// Names of the user adjustable score weightings
var WeightName;
(function (WeightName) {
    WeightName["CHAOS"] = "Chaos";
    WeightName["DIVERSITY"] = "Diversity";
    WeightName["FAVOURITED_ACCOUNTS"] = "FavouritedAccounts";
    WeightName["FOLLOWED_TAGS"] = "FollowedTags";
    WeightName["HASHTAG_PARTICIPATION"] = "HashtagParticipation";
    WeightName["IMAGE_ATTACHMENTS"] = "ImageAttachments";
    WeightName["INTERACTIONS"] = "Interactions";
    WeightName["MENTIONS_FOLLOWED"] = "MentionsFollowed";
    WeightName["MOST_REPLIED_ACCOUNTS"] = "MostRepliedAccounts";
    WeightName["MOST_RETOOTED_ACCOUNTS"] = "MostRetootedAccounts";
    WeightName["NUM_FAVOURITES"] = "NumFavourites";
    WeightName["NUM_REPLIES"] = "NumReplies";
    WeightName["NUM_RETOOTS"] = "NumRetoots";
    WeightName["RETOOTED_IN_FEED"] = "RetootedInFeed";
    WeightName["TRENDING_LINKS"] = "TrendingLinks";
    WeightName["TRENDING_TAGS"] = "TrendingTags";
    WeightName["TRENDING_TOOTS"] = "TrendingToots";
    WeightName["VIDEO_ATTACHMENTS"] = "VideoAttachments";
    // Special weights
    WeightName["TIME_DECAY"] = "TimeDecay";
    WeightName["TRENDING"] = "Trending";
})(WeightName || (exports.WeightName = WeightName = {}));
;
// Keys that are valid for local browser storage.
var StorageKey;
(function (StorageKey) {
    StorageKey["BLOCKED_ACCOUNTS"] = "BlockedAccounts";
    StorageKey["FAVOURITED_TOOTS"] = "FavouritedToots";
    StorageKey["FEDIVERSE_TRENDING_TAGS"] = "FediverseTrendingTags";
    StorageKey["FEDIVERSE_TRENDING_LINKS"] = "FediverseTrendingLinks";
    StorageKey["FEDIVERSE_TRENDING_TOOTS"] = "FediverseTrendingToots";
    StorageKey["FILTERS"] = "Filters";
    StorageKey["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    StorageKey["FOLLOWED_TAGS"] = "FollowedTags";
    StorageKey["HOME_TIMELINE"] = "HomeTimeline";
    StorageKey["MUTED_ACCOUNTS"] = "MutedAccounts";
    StorageKey["OPENINGS"] = "Openings";
    StorageKey["PARTICIPATED_TAG_TOOTS"] = "ParticipatedHashtagToots";
    StorageKey["POPULAR_SERVERS"] = "PopularServers";
    StorageKey["RECENT_NOTIFICATIONS"] = "RecentNotifications";
    StorageKey["RECENT_USER_TOOTS"] = "RecentUserToots";
    StorageKey["SERVER_SIDE_FILTERS"] = "ServerFilters";
    StorageKey["TIMELINE"] = "Timeline";
    StorageKey["TRENDING_TAG_TOOTS"] = "TrendingTagToots";
    StorageKey["TOOT_TESTER"] = "TootTester";
    StorageKey["USER"] = "FedialgoUser";
    StorageKey["USER_DATA"] = "UserData";
    StorageKey["WEIGHTS"] = "Weights";
})(StorageKey || (exports.StorageKey = StorageKey = {}));
;
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