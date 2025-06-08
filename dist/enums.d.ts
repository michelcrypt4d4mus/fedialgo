export declare enum CacheKey {
    BLOCKED_ACCOUNTS = "BlockedAccounts",
    FAVOURITED_TOOTS = "FavouritedToots",
    FEDIVERSE_POPULAR_SERVERS = "FediversePopularServers",
    FEDIVERSE_TRENDING_TAGS = "FediverseTrendingTags",
    FEDIVERSE_TRENDING_LINKS = "FediverseTrendingLinks",
    FEDIVERSE_TRENDING_TOOTS = "FediverseTrendingToots",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    FOLLOWERS = "Followers",
    HASHTAG_TOOTS = "HashtagToots",
    HOME_TIMELINE_TOOTS = "HomeTimelineToots",
    MUTED_ACCOUNTS = "MutedAccounts",
    NOTIFICATIONS = "Notifications",
    RECENT_USER_TOOTS = "RecentUserToots",
    SERVER_SIDE_FILTERS = "ServerFilters",
    TIMELINE_TOOTS = "TimelineToots"
}
export declare enum TagTootsCacheKey {
    FAVOURITED_TAG_TOOTS = "FavouritedHashtagToots",
    PARTICIPATED_TAG_TOOTS = "ParticipatedHashtagToots",
    TRENDING_TAG_TOOTS = "TrendingTagToots"
}
export type ApiCacheKey = CacheKey | TagTootsCacheKey;
export declare const ALL_CACHE_KEYS: (CacheKey | TagTootsCacheKey)[];
export declare function buildCacheKeyDict<T>(fxn: (key?: ApiCacheKey) => T, keys?: ApiCacheKey[]): Record<ApiCacheKey, T>;
export declare enum AlgorithmStorageKey {
    APP_OPENS = "AppOpens",
    FILTERS = "Filters",
    USER = "FedialgoUser",
    WEIGHTS = "Weights"
}
export declare enum NonScoreWeightName {
    TIME_DECAY = "TimeDecay",
    TRENDING = "Trending",
    OUTLIER_DAMPENER = "OutlierDampener"
}
export declare enum ScoreName {
    ALREADY_SHOWN = "AlreadyShown",
    AUTHOR_FOLLOWERS = "AuthorFollowers",
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVOURITED_ACCOUNTS = "FavouritedAccounts",
    FAVOURITED_TAGS = "FavouritedTags",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    IMAGE_ATTACHMENTS = "ImageAttachments",
    INTERACTIONS = "Interactions",
    MENTIONS_FOLLOWED = "MentionsFollowed",
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = "MostRetootedAccounts",
    NUM_FAVOURITES = "NumFavourites",
    NUM_REPLIES = "NumReplies",
    NUM_RETOOTS = "NumRetoots",
    PARTICIPATED_TAGS = "ParticipatedTags",
    RETOOTED_IN_FEED = "RetootedInFeed",
    TRENDING_LINKS = "TrendingLinks",
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = "VideoAttachments"
}
export declare enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video"
}
export declare enum TrendingType {
    LINKS = "links",
    SERVERS = "servers",
    STATUSES = "statuses",
    TAGS = "tags"
}
export declare enum BooleanFilterName {
    HASHTAG = "hashtag",
    LANGUAGE = "language",
    TYPE = "type",
    USER = "user",
    APP = "app"
}
export declare enum TypeFilterName {
    AUDIO = "audio",
    BOT = "bot",
    DIRECT_MESSAGE = "direct messages",
    FOLLOWED_ACCOUNTS = "followed accounts",
    FOLLOWED_HASHTAGS = "followed hashtags",
    IMAGES = "images",
    LINKS = "links",
    MENTIONS = "mentions",
    PARTICIPATED_TAGS = "participated hashtags",
    POLLS = "polls",
    PRIVATE = "private",
    REPLIES = "replies",
    RETOOTS = "retoots",
    SENSITIVE = "sensitive",
    SPOILERED = "spoilered",
    TRENDING_LINKS = "trending links",
    TRENDING_TAGS = "trending hashtags",
    TRENDING_TOOTS = "trending toots",
    VIDEOS = "videos"
}
