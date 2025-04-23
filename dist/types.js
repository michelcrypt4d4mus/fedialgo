"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDIA_CATEGORY = exports.WeightName = exports.Key = void 0;
var Key;
(function (Key) {
    Key["BLOCKED_ACCOUNTS"] = "blockedAccounts";
    Key["FILTERS"] = "filters";
    Key["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    Key["HOME_TIMELINE"] = "homeTimeline";
    Key["LAST_OPENED"] = "lastOpened";
    Key["MUTED_ACCOUNTS"] = "mutedAccounts";
    Key["OPENINGS"] = "openings";
    Key["POPULAR_SERVERS"] = "popularServers";
    Key["RECENT_FAVOURITES"] = "recentFavourites";
    Key["RECENT_NOTIFICATIONS"] = "recentNotifications";
    Key["RECENT_TOOTS"] = "recentToots";
    Key["RECENT_USER_TOOTS"] = "recentUserToots";
    Key["SERVER_SIDE_FILTERS"] = "serverFilters";
    Key["TIMELINE"] = "timeline";
    Key["TRENDING"] = "trending";
    Key["USER"] = "algouser";
    Key["WEIGHTS"] = "weights";
})(Key || (exports.Key = Key = {}));
;
var WeightName;
(function (WeightName) {
    WeightName["CHAOS"] = "Chaos";
    WeightName["DIVERSITY"] = "Diversity";
    WeightName["FAVORITED_ACCOUNTS"] = "FavoritedAccounts";
    WeightName["FOLLOWED_TAGS"] = "FollowedTags";
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
var MEDIA_CATEGORY;
(function (MEDIA_CATEGORY) {
    MEDIA_CATEGORY["AUDIO"] = "audio";
    MEDIA_CATEGORY["IMAGE"] = "image";
    MEDIA_CATEGORY["VIDEO"] = "video";
})(MEDIA_CATEGORY || (exports.MEDIA_CATEGORY = MEDIA_CATEGORY = {}));
;
;
;
;
;
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