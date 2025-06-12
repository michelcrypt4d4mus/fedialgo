/*
 * Enums (and a few enum related helper methods and constsants) used by FediAlgo.
 */

/**
 * Enum of keys used to cache Mastodon API data in the browser's IndexedDB via localForage.
 * Keys that contain Toots should end with "_TOOTS", likewise for Account objects with "_ACCOUNTS".
 * Used for Storage and cache management.
 * @enum {string}
 * @private
 */
export enum CacheKey {
    BLOCKED_ACCOUNTS = 'BlockedAccounts',
    BLOCKED_DOMAINS = 'BlockedDomains',
    FAVOURITED_TOOTS = 'FavouritedToots',
    FEDIVERSE_POPULAR_SERVERS = 'FediversePopularServers',
    FEDIVERSE_TRENDING_TAGS = 'FediverseTrendingTags',
    FEDIVERSE_TRENDING_LINKS = 'FediverseTrendingLinks',
    FEDIVERSE_TRENDING_TOOTS = 'FediverseTrendingToots',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    FOLLOWED_TAGS = 'FollowedTags',  // this used to be actually set to ScoreName.FOLLOWED_TAGS (same string)... i don't think there's any reason to keep that now
    FOLLOWERS = 'Followers',
    HASHTAG_TOOTS = 'HashtagToots',  // TODO: there's nothing actually stored here but it's a flag for Toot serialization
    HOME_TIMELINE_TOOTS = 'HomeTimelineToots',// Toots that the API returns for the home timeline
    MUTED_ACCOUNTS = 'MutedAccounts',
    NOTIFICATIONS = 'Notifications',
    RECENT_USER_TOOTS = 'RecentUserToots',
    SERVER_SIDE_FILTERS = 'ServerFilters',
    TIMELINE_TOOTS = 'TimelineToots',// The entire timeline (home timeline + trending toots etc.)
};

/**
 * Enum of cache keys for hashtag-related lists of Toots
 * @enum {string}
 */
export enum TagTootsCacheKey {
    FAVOURITED_TAG_TOOTS = 'FavouritedHashtagToots',
    PARTICIPATED_TAG_TOOTS = 'ParticipatedHashtagToots',
    TRENDING_TAG_TOOTS = 'TrendingTagToots'
};

/**
 * Type representing any valid API cache key (CacheKey or TagTootsCacheKey).
 * @private
 */
export type ApiCacheKey = CacheKey | TagTootsCacheKey;


/**
 * Enum of storage keys for user data and app state (not API cache).
 * @private
 */
export enum AlgorithmStorageKey {
    APP_OPENS = 'AppOpens',
    FILTERS = 'Filters',
    USER = 'FedialgoUser',
    WEIGHTS = 'Weights'
};

/**
 * Enum of non-score weight names (used for sliders and scoring adjustments).
 * Order influences the order of the score weighting sliders in the demo app.
 * @enum {string}
 */
export enum NonScoreWeightName {
    TIME_DECAY = 'TimeDecay',
    TRENDING = 'Trending',
    OUTLIER_DAMPENER = 'OutlierDampener'
};

/**
 * Enum of all scoring categories for which there is a scorer. Also Used for UI display and filtering.
 * @enum {string}
 */
export enum ScoreName {
    ALREADY_SHOWN = 'AlreadyShown',
    AUTHOR_FOLLOWERS = 'AuthorFollowers',
    CHAOS = 'Chaos',
    DIVERSITY = 'Diversity',
    FAVOURITED_ACCOUNTS = 'FavouritedAccounts',
    FAVOURITED_TAGS = 'FavouritedTags',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    FOLLOWED_TAGS = 'FollowedTags',
    FOLLOWERS = 'Followers',
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


/**
 * Enum of Mastodon API media category strings.
 * @enum {string}
 */
export enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video"
};

/**
 * Enum of trending data types that can be fetched from the API. *
 * @enum {string}
 */
export enum TrendingType {
    LINKS = "links",
    SERVERS = 'servers',// Not necessarily really a trending data type but for now...
    STATUSES = "statuses",
    TAGS = "tags"
};

/**
 * Enum of boolean filter names for filtering toots by property.
 * @enum {string}
 */
export enum BooleanFilterName {
    APP = 'app',
    HASHTAG = 'hashtag',
    LANGUAGE = 'language',
    SERVER = 'server',
    TYPE = 'type',
    USER = 'user',
};

/**
 * Enum of type filter names for filtering toots by type (e.g., audio, bot, images, etc.).
 * The values have spaces for better presentation in the demo app.
 * @enum {string}
 */
export enum TypeFilterName {
    AUDIO = 'audio',
    BOT = 'bot',
    DIRECT_MESSAGE = 'direct messages',
    FOLLOWED_ACCOUNTS = 'followed accounts',
    FOLLOWED_HASHTAGS = 'followed hashtags',
    IMAGES = 'images',
    LINKS = 'links',
    MENTIONS = 'mentions',
    PARTICIPATED_TAGS = 'participated hashtags',
    POLLS = 'polls',
    PRIVATE = 'private',
    REPLIES = 'replies',
    RETOOTS = 'retoots',
    SENSITIVE = 'sensitive',
    SPOILERED = 'spoilered',
    TRENDING_LINKS = 'trending links',
    TRENDING_TAGS = 'trending hashtags',
    TRENDING_TOOTS = 'trending toots',
    VIDEOS = 'videos'
};


/**
 * Array of all cache keys (CacheKey and TagTootsCacheKey values).
 * @private
 */
export const ALL_CACHE_KEYS = [...Object.values(CacheKey), ...Object.values(TagTootsCacheKey)] as const;


/**
 * Build a dictionary of values for each ApiCacheKey using the provided function.
 * @template T
 * @param {(key?: ApiCacheKey) => T} fxn - Function to generate a value for each key.
 * @param {ApiCacheKey[]} [keys] - Optional list of keys to use (defaults to ALL_CACHE_KEYS).
 * @returns {Record<ApiCacheKey, T>} Dictionary of values by cache key.
 * @private
 */
export function buildCacheKeyDict<T>(
    fxn: (key?: ApiCacheKey) => T,
    keys?: ApiCacheKey[]
): Record<ApiCacheKey, T> {
    return (keys || ALL_CACHE_KEYS).reduce((dict, key) => {
        dict[key] = fxn(key);
        return dict;
    }, {} as Record<ApiCacheKey, T>);
};


/**
 * Generate a function to check if a value exists in a string enum.
 * @template E
 * @param {Record<string, E>} strEnum - The enum object.
 * @returns {(value: string) => boolean} The checker function.
 */
export function isValueInStringEnum<E extends string>(strEnum: Record<string, E>): ((str: string) => boolean) {
    const enumValues = new Set(Object.values(strEnum) as string[]);
    return (str: string): str is E => enumValues.has(str);
};


/** True if argument is a member of ScoreName enum. */
export const isScoreName = isValueInStringEnum(ScoreName);
/** True if argument is a member of NonScoreWeightName enum. */
export const isNonScoreWeightName = isValueInStringEnum(NonScoreWeightName);
/** True if argument is a member of TypeFilterName enum. */
export const isTypeFilterName = isValueInStringEnum(TypeFilterName);
/** True if argument is a member of ScoreName or NonScoreWeightName enums. */
export const isWeightName = (str: string) => isScoreName(str) || isNonScoreWeightName(str);
