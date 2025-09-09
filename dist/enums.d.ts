/**
 * Enums (and a few enum related helper methods and constants) used by FediAlgo.
 * @module enums
 */
import { type Optional } from './types';
/**
 * Actions that {@linkcode TheAlgorithm} can take.
 * @enum {string}
 * @private
 */
export declare enum LoadAction {
    FEED_UPDATE = "triggerFeedUpdate",
    GET_CONVERSATION = "conversation",
    GET_MOAR_DATA = "triggerMoarData",
    IS_BUSY = "isBusy",
    PULL_ALL_USER_DATA = "triggerPullAllUserData",
    REFRESH_MUTED_ACCOUNTS = "refreshMutedAccounts",
    RESET = "reset",
    TIMELINE_BACKFILL = "triggerTimelineBackfill"
}
export declare enum LogAction {
    FINISH_FEED_UPDATE = "finishFeedUpdate",
    INITIAL_LOADING_STATUS = "initialState"
}
export type Action = LoadAction | LogAction;
/**
 * Enum of storage keys for user data and app state and other things not directly tied to API calls.
 * @private
 * @enum {string}
 */
export declare enum AlgorithmStorageKey {
    APP_OPENS = "AppOpens",
    FILTERS = "Filters",
    TIMELINE_TOOTS = "TimelineToots",
    USER = "FedialgoUser",
    WEIGHTS = "Weights"
}
/**
 * Enum of keys used to cache Mastodon API data in the browser's IndexedDB via localForage.
 * Keys that contain Toots should end with "_TOOTS", likewise for Account objects with "_ACCOUNTS".
 * Used for {@linkcode Storage} and cache management.
 * @private
 * @enum {string}
 */
export declare enum CacheKey {
    BLOCKED_ACCOUNTS = "BlockedAccounts",
    BLOCKED_DOMAINS = "BlockedDomains",
    FAVOURITED_TOOTS = "FavouritedToots",
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
    SERVER_SIDE_FILTERS = "ServerFilters"
}
/**
 * Enum of cache keys for the fediverse wide trending data.
 * @private
 * @enum {string}
 */
export declare enum FediverseCacheKey {
    POPULAR_SERVERS = "FediversePopularServers",
    TRENDING_TAGS = "FediverseTrendingTags",
    TRENDING_LINKS = "FediverseTrendingLinks",
    TRENDING_TOOTS = "FediverseTrendingToots"
}
/**
 * Enum of categories of toots pulled for a type of tag (favourited/particated/trending).
 * @enum {string}
 */
export declare enum TagTootsCategory {
    FAVOURITED = "FavouritedHashtagToots",
    PARTICIPATED = "ParticipatedHashtagToots",
    TRENDING = "TrendingTagToots"
}
/**
 * Enum of non-score weight names (used for sliders and scoring adjustments).
 * NOTE: Order influences the order of the score weighting sliders in the demo app.
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
 * Enum of trending data types that can be fetched from the API.
 * @enum {string}
 */
export declare enum TrendingType {
    LINKS = "links",
    SERVERS = "servers",
    STATUSES = "statuses",
    TAGS = "tags"
}
/**
 * Enum of boolean filter names for filtering {@linkcode Toot}s by property.
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
 * Enum of type filter names for filtering {@linkcode Toot}s by type (e.g., audio, bot, images, etc.).
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
export type ApiCacheKey = CacheKey | FediverseCacheKey | TagTootsCategory;
/** All browser storage indexedDB keys. */
export type StorageKey = AlgorithmStorageKey | ApiCacheKey;
/** Utility type. */
export type IsNullOrUndefined<T> = null extends T ? (undefined extends T ? true : false) : false;
/** Possible uniqufiiers for a class of ApiObjs. */
type ApiObjUniqueProperty = 'id' | 'name' | 'uri' | 'webfingerURI' | null;
/** Which property, if any, can serve as a uniquifier for rows stored at that ApiCacheKey. */
type UniqueIdProperties = Record<ApiCacheKey, ApiObjUniqueProperty>;
export declare const ALL_ACTIONS: readonly (LogAction | LoadAction)[];
export declare const ALL_CACHE_KEYS: readonly (CacheKey | FediverseCacheKey | TagTootsCategory)[];
export declare const STORAGE_KEYS_WITH_ACCOUNTS: StorageKey[];
export declare const STORAGE_KEYS_WITH_TOOTS: StorageKey[];
export declare const UNIQUE_ID_PROPERTIES: UniqueIdProperties;
export declare const TOOT_SOURCES: readonly [...StorageKey[], LoadAction.GET_CONVERSATION, LoadAction.REFRESH_MUTED_ACCOUNTS];
export declare const MONTHS: readonly ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
export declare const MONTHS_SHORT: string[];
export declare const DAY_NAMES: readonly ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export declare const DAYS_SHORT: string[];
type CachedByKey<K extends string, T, U extends Optional<Record<K, T>>> = IsNullOrUndefined<U> extends true ? Record<ApiCacheKey, T> : Record<ApiCacheKey | K, T>;
/**
 * Build a dictionary of values for each {@linkcode ApiCacheKey} using the provided function.
 * @private
 * @template K
 * @template T
 * @param {(key?: ApiCacheKey) => T} fxn - Function to generate a value for each key.
 * @param {Record<K, T>} [initialDict] - Optional initial dictionary to extend (default={}).
 * @param {ApiCacheKey[]} [keys] - Optional list of keys to use (defaults to ALL_CACHE_KEYS).
 * @returns {Record<ApiCacheKey, T>} Dictionary of values by cache key.
 */
export declare function buildCacheKeyDict<K extends string, T, D extends Optional<Record<K, T>>>(fxn: (key: ApiCacheKey) => T, initialDict?: Optional<Record<K, T>>, keys?: ApiCacheKey[]): CachedByKey<K, T, D>;
export declare function simpleCacheKeyDict<T>(fxn: () => T, keys?: ApiCacheKey[]): Record<ApiCacheKey, T>;
/**
 * Generate a function to check if a value exists in a string enum.
 * @template E
 * @param {Record<string, E>} strEnum - The enum object.
 * @returns {(value: string) => boolean} The checker function.
 */
export declare function isValueInStringEnum<E extends string>(strEnum: Record<string, E>): ((str: string) => boolean);
/** True if argument is a member of {@linkcode enums.CacheKey}. */
export declare const isCacheKey: (str: string) => boolean;
/** True if argument is a member of {@linkcode enums.TagTootsCategory}. */
export declare const isTagTootsCategory: (str: string) => boolean;
/** True if argument is a member of {@linkcode enums.FediverseCacheKey}. */
export declare const isFediverseCacheKey: (str: string) => boolean;
/** True if argument is an {@linkcode enums.ApiCacheKey}. */
export declare const isApiCacheKey: (s: string) => boolean;
/** True if argument is a member of {@linkcode enums.NonScoreWeightName} enum. */
export declare const isNonScoreWeightName: (str: string) => boolean;
/** True if argument is a member of {@linkcode enums.ScoreName} enum. */
export declare const isScoreName: (str: string) => boolean;
/** True if argument is a member of {@linkcode enums.TypeFilterName} enum. */
export declare const isTypeFilterName: (str: string) => boolean;
/** True if argument is a member of {@linkcode enums.ScoreName} or {@linkcode NonScoreWeightName} enums. */
export declare const isWeightName: (str: string) => boolean;
export declare const SECONDS_IN_MINUTE = 60;
export declare const MINUTES_IN_HOUR = 60;
export declare const MINUTES_IN_DAY: number;
export declare const SECONDS_IN_HOUR: number;
export declare const SECONDS_IN_DAY: number;
export declare const SECONDS_IN_WEEK: number;
export {};
