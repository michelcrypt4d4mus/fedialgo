"use strict";
/*
 * Holds a few enums to keep types.ts clean and avoid some potential circular dependencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeFilterName = exports.BooleanFilterName = exports.TrendingType = exports.MediaCategory = exports.ScoreName = exports.NonScoreWeightName = exports.AlgorithmStorageKey = exports.TagTootsCacheKey = exports.CacheKey = void 0;
// Keys used to cache Mastodon API data in the browser's IndexedDB via localForage
// Keys that contain Toots should end with "_TOOTS", likewise for Account objects w/"_ACCOUNTS"
// This should live in Storage.ts but that creates a circular dependency with config.ts
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
    CacheKey["HASHTAG_TOOTS"] = "HashtagToots";
    CacheKey["HOME_TIMELINE_TOOTS"] = "HomeTimelineToots";
    CacheKey["MUTED_ACCOUNTS"] = "MutedAccounts";
    CacheKey["NOTIFICATIONS"] = "Notifications";
    CacheKey["RECENT_USER_TOOTS"] = "RecentUserToots";
    CacheKey["SERVER_SIDE_FILTERS"] = "ServerFilters";
    CacheKey["TIMELINE_TOOTS"] = "TimelineToots";
})(CacheKey || (exports.CacheKey = CacheKey = {}));
;
var TagTootsCacheKey;
(function (TagTootsCacheKey) {
    TagTootsCacheKey["FAVOURITED_TAG_TOOTS"] = "FavouritedHashtagToots";
    TagTootsCacheKey["PARTICIPATED_TAG_TOOTS"] = "ParticipatedHashtagToots";
    TagTootsCacheKey["TRENDING_TAG_TOOTS"] = "TrendingTagToots";
})(TagTootsCacheKey || (exports.TagTootsCacheKey = TagTootsCacheKey = {}));
;
// Storage keys but not for the API cache, for user data etc.
var AlgorithmStorageKey;
(function (AlgorithmStorageKey) {
    AlgorithmStorageKey["APP_OPENS"] = "AppOpens";
    AlgorithmStorageKey["FILTERS"] = "Filters";
    AlgorithmStorageKey["USER"] = "FedialgoUser";
    AlgorithmStorageKey["WEIGHTS"] = "Weights";
})(AlgorithmStorageKey || (exports.AlgorithmStorageKey = AlgorithmStorageKey = {}));
;
// Order currently influences the order of the score weighting sliders in the demo app
var NonScoreWeightName;
(function (NonScoreWeightName) {
    NonScoreWeightName["TIME_DECAY"] = "TimeDecay";
    NonScoreWeightName["TRENDING"] = "Trending";
    NonScoreWeightName["OUTLIER_DAMPENER"] = "OutlierDampener";
})(NonScoreWeightName || (exports.NonScoreWeightName = NonScoreWeightName = {}));
;
// There's a scorer for each of these ScoreNames
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
// Mastodon API media category strings
var MediaCategory;
(function (MediaCategory) {
    MediaCategory["AUDIO"] = "audio";
    MediaCategory["IMAGE"] = "image";
    MediaCategory["VIDEO"] = "video";
})(MediaCategory || (exports.MediaCategory = MediaCategory = {}));
;
// Kinds of trending data that can be fetched
var TrendingType;
(function (TrendingType) {
    TrendingType["LINKS"] = "links";
    TrendingType["SERVERS"] = "servers";
    TrendingType["STATUSES"] = "statuses";
    TrendingType["TAGS"] = "tags";
})(TrendingType || (exports.TrendingType = TrendingType = {}));
;
var BooleanFilterName;
(function (BooleanFilterName) {
    BooleanFilterName["HASHTAG"] = "hashtag";
    BooleanFilterName["LANGUAGE"] = "language";
    BooleanFilterName["TYPE"] = "type";
    BooleanFilterName["USER"] = "user";
    BooleanFilterName["APP"] = "app";
})(BooleanFilterName || (exports.BooleanFilterName = BooleanFilterName = {}));
;
// The values have spaces to make them more usable in the demo app's presentation
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
//# sourceMappingURL=enums.js.map