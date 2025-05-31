
/*
 * Holds a few enums to keep types.ts clean and avoid some potential circular dependencies.
 */
// Keys used to cache Mastodon API data in the browser's IndexedDB via localForage
// Keys that contain Toots should end with "_TOOTS", likewise for Account objects w/"_ACCOUNTS"
// This should live in Storage.ts but that creates a circular dependency with config.ts
export enum CacheKey {
    BLOCKED_ACCOUNTS = 'BlockedAccounts',
    FAVOURITED_TOOTS = 'FavouritedToots',
    FAVOURITED_HASHTAG_TOOTS = 'FavouritedHashtagToots',
    FEDIVERSE_POPULAR_SERVERS = 'FediversePopularServers',
    FEDIVERSE_TRENDING_TAGS = 'FediverseTrendingTags',
    FEDIVERSE_TRENDING_LINKS = 'FediverseTrendingLinks',
    FEDIVERSE_TRENDING_TOOTS = 'FediverseTrendingToots',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    FOLLOWED_TAGS = 'FollowedTags',  // TODO: This used to be actually set to ScoreName.FOLLOWED_TAGS (same string)... i don't think there's any reason to keep that now
    HASHTAG_TOOTS = 'HashtagToots',// TODO: there's nothing actually stored here but it's a flag for Toot serialization
    HOME_TIMELINE_TOOTS = 'HomeTimelineToots',// Toots that the API returns for the home timeline
    MUTED_ACCOUNTS = 'MutedAccounts',
    NOTIFICATIONS = 'Notifications',
    PARTICIPATED_TAG_TOOTS = 'ParticipatedHashtagToots',
    RECENT_USER_TOOTS = 'RecentUserToots',
    SERVER_SIDE_FILTERS = 'ServerFilters',
    TIMELINE_TOOTS = 'TimelineToots',// The entire timeline (home timeline + trending toots etc.)
    TRENDING_TAG_TOOTS = 'TrendingTagToots'
};

// Storage keys but not for the API cache, for user data etc.
export enum AlgorithmStorageKey {
    APP_OPENS = 'AppOpens',
    FILTERS = 'Filters',
    USER = 'FedialgoUser',
    WEIGHTS = 'Weights'
};

// Order currently influences the order of the score weighting sliders in the demo app
export enum NonScoreWeightName {
    TIME_DECAY = 'TimeDecay',
    TRENDING = 'Trending',
    OUTLIER_DAMPENER = 'OutlierDampener'
};

// There's a scorer for each of these ScoreNames
export enum ScoreName {
    ALREADY_SHOWN = 'AlreadyShown',
    CHAOS = 'Chaos',
    DIVERSITY = 'Diversity',
    FAVOURITED_ACCOUNTS = 'FavouritedAccounts',
    FAVOURITED_TAGS = 'FavouritedTags',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    FOLLOWED_TAGS = 'FollowedTags',
    IMAGE_ATTACHMENTS = 'ImageAttachments',
    INTERACTIONS = 'Interactions',
    MENTIONS_FOLLOWED = 'MentionsFollowed',
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = 'MostRetootedAccounts',
    NUM_FAVOURITES = 'NumFavourites',
    NUM_REPLIES = 'NumReplies',
    NUM_RETOOTS = 'NumRetoots',
    PARTICIPATED_TAGS = 'ParticipatedTags',
    RETOOTED_IN_FEED = 'RetootedInFeed',
    TRENDING_LINKS = 'TrendingLinks',
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = 'VideoAttachments'
};

// Mastodon API media category strings
export enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video"
};

// Kinds of trending data that can be fetched
export enum TrendingType {
    LINKS = "links",
    SERVERS = 'servers',// Not necessarily really a trending data type but for now...
    STATUSES = "statuses",
    TAGS = "tags"
};
