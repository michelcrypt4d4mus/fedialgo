/**
 * Enum of storage keys for user data and app state (not API cache).
 * @enum {string}
 * @private
 */
export declare enum AlgorithmStorageKey {
    APP_OPENS = "AppOpens",
    FILTERS = "Filters",
    USER = "FedialgoUser",
    WEIGHTS = "Weights"
}
/**
 * Enum of keys used to cache Mastodon API data in the browser's IndexedDB via localForage.
 * Keys that contain Toots should end with "_TOOTS", likewise for Account objects with "_ACCOUNTS".
 * Used for Storage and cache management.
 * @enum {string}
 * @private
 */
export declare enum CacheKey {
    BLOCKED_ACCOUNTS = "BlockedAccounts",
    BLOCKED_DOMAINS = "BlockedDomains",
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
    HOMESERVER_TOOTS = "HomeserverToots",
    INSTANCE_INFO = "InstanceInfo",
    MUTED_ACCOUNTS = "MutedAccounts",
    NOTIFICATIONS = "Notifications",
    RECENT_USER_TOOTS = "RecentUserToots",
    SERVER_SIDE_FILTERS = "ServerFilters",
    TIMELINE_TOOTS = "TimelineToots"
}
/**
 * Enum of localForage cache keys for Toots pulled from the API for a list of hashtags.
 * @enum {string}
 * @private
 */
export declare enum TagTootsCacheKey {
    FAVOURITED_TAG_TOOTS = "FavouritedHashtagToots",
    PARTICIPATED_TAG_TOOTS = "ParticipatedHashtagToots",
    TRENDING_TAG_TOOTS = "TrendingTagToots"
}
/**
 * Enum of non-score weight names (used for sliders and scoring adjustments).
 * Order influences the order of the score weighting sliders in the demo app.
 * @enum {string}
 */
export declare enum NonScoreWeightName {
    TIME_DECAY = "TimeDecay",
    TRENDING = "Trending",
    OUTLIER_DAMPENER = "OutlierDampener"
}
/**
 * Enum of all scoring categories for which there is a scorer. Also Used for UI display and filtering.
 * @enum {string}
 */
export declare enum ScoreName {
    ALREADY_SHOWN = "AlreadyShown",
    AUTHOR_FOLLOWERS = "AuthorFollowers",
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVOURITED_ACCOUNTS = "FavouritedAccounts",
    FAVOURITED_TAGS = "FavouritedTags",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    FOLLOWERS = "Followers",
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
/**
 * Enum of Mastodon API media category strings.
 * @enum {string}
 */
export declare enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video"
}
/**
 * Enum of trending data types that can be fetched from the API. *
 * @enum {string}
 */
export declare enum TrendingType {
    LINKS = "links",
    SERVERS = "servers",
    STATUSES = "statuses",
    TAGS = "tags"
}
/**
 * Enum of boolean filter names for filtering toots by property.
 * @enum {string}
 */
export declare enum BooleanFilterName {
    APP = "app",
    HASHTAG = "hashtag",
    LANGUAGE = "language",
    SERVER = "server",
    TYPE = "type",
    USER = "user"
}
/**
 * Enum of type filter names for filtering toots by type (e.g., audio, bot, images, etc.).
 * The values have spaces for better presentation in the demo app.
 * @enum {string}
 */
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
/** API data is written to browser storage with these cache keys. */
export type ApiCacheKey = CacheKey | TagTootsCacheKey;
/** All browser storage indexedDB keys. */
export type StorageKey = AlgorithmStorageKey | CacheKey | TagTootsCacheKey;
/** Possible uniqufiiers for a class of ApiObjs. */
type ApiObjUniqueProperty = 'id' | 'name' | 'uri' | 'webfingerURI' | null;
/** Which property, if any, can serve as a uniquifier for rows stored at that ApiCacheKey. */
type UniqueIdProperties = Record<ApiCacheKey, ApiObjUniqueProperty>;
export declare const STORAGE_KEYS_WITH_TOOTS: StorageKey[];
export declare const STORAGE_KEYS_WITH_ACCOUNTS: StorageKey[];
export declare const UNIQUE_ID_PROPERTIES: UniqueIdProperties;
export declare const ALL_CACHE_KEYS: readonly (CacheKey | TagTootsCacheKey)[];
export declare const CONVERSATION = "conversation";
export declare const JUST_MUTING = "justMuting";
export declare const TOOT_SOURCES: readonly [...StorageKey[], "conversation", "justMuting"];
/**
 * Build a dictionary of values for each ApiCacheKey using the provided function.
 * @template T
 * @param {(key?: ApiCacheKey) => T} fxn - Function to generate a value for each key.
 * @param {ApiCacheKey[]} [keys] - Optional list of keys to use (defaults to ALL_CACHE_KEYS).
 * @returns {Record<ApiCacheKey, T>} Dictionary of values by cache key.
 * @private
 */
export declare function buildCacheKeyDict<T>(fxn: (key?: ApiCacheKey) => T, keys?: ApiCacheKey[]): Record<ApiCacheKey, T>;
/**
 * Generate a function to check if a value exists in a string enum.
 * @template E
 * @param {Record<string, E>} strEnum - The enum object.
 * @returns {(value: string) => boolean} The checker function.
 */
export declare function isValueInStringEnum<E extends string>(strEnum: Record<string, E>): ((str: string) => boolean);
/** True if argument is a member of NonScoreWeightName enum. */
export declare const isNonScoreWeightName: (str: string) => boolean;
/** True if argument is a member of ScoreName enum. */
export declare const isScoreName: (str: string) => boolean;
/** True if argument is a member of TypeFilterName enum. */
export declare const isTypeFilterName: (str: string) => boolean;
/** True if argument is a member of ScoreName or NonScoreWeightName enums. */
export declare const isWeightName: (str: string) => boolean;
export {};
