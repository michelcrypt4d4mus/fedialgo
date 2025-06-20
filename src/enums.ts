/**
 * Enums (and a few enum related helper methods and constsants) used by FediAlgo.
 * @module enums
 */

import { type Optional } from './types';

/**
 * Actions that TheAlgorithm can take.
 * @enum {string}
 * @private
 */
export enum LoadAction {
    IS_BUSY = 'isBusy',
    REFRESH_MUTED_ACCOUNTS = 'refreshMutedAccounts',
    RESET = 'reset',
    TRIGGER_FEED_UPDATE = "triggerFeedUpdate",
    TRIGGER_MOAR_DATA = 'triggerMoarData',
    TRIGGER_PULL_ALL_USER_DATA = "triggerPullAllUserData",
    TRIGGER_TIMELINE_BACKFILL = "triggerTimelineBackfill",
};

export enum LogAction {
    FINISH_FEED_UPDATE = 'finishFeedUpdate',
    INITIAL_LOADING_STATUS = 'initialState',
};

export type Action = LoadAction | LogAction;


/**
 * Enum of storage keys for user data and app state and other things not directly tied to API calls.
 * @private
 * @enum {string}
 */
export enum AlgorithmStorageKey {
    APP_OPENS = 'AppOpens',
    FILTERS = 'Filters',
    TIMELINE_TOOTS = 'TimelineToots',  // The entire timeline (home timeline + trending toots etc.)
    USER = 'FedialgoUser',
    WEIGHTS = 'Weights'
};

/**
 * Enum of keys used to cache Mastodon API data in the browser's IndexedDB via localForage.
 * Keys that contain Toots should end with "_TOOTS", likewise for Account objects with "_ACCOUNTS".
 * Used for Storage and cache management.
 * @private
 * @enum {string}
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
    HOME_TIMELINE_TOOTS = 'HomeTimelineToots',  // Toots that the API returns for the home timeline
    HOMESERVER_TOOTS = 'HomeserverToots',
    INSTANCE_INFO = 'InstanceInfo',
    MUTED_ACCOUNTS = 'MutedAccounts',
    NOTIFICATIONS = 'Notifications',
    RECENT_USER_TOOTS = 'RecentUserToots',
    SERVER_SIDE_FILTERS = 'ServerFilters',
};

/**
 * Enum of localForage cache keys for Toots pulled from the API for a list of hashtags.
 * @enum {string}
 */
export enum TagTootsCategory {
    FAVOURITED = 'FavouritedHashtagToots',
    PARTICIPATED = 'ParticipatedHashtagToots',
    TRENDING = 'TrendingTagToots'
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


//////////////////
//    Types     //
//////////////////

/** API data is written to browser storage with these cache keys. */
export type ApiCacheKey = CacheKey | TagTootsCategory;
/** All browser storage indexedDB keys. */
export type StorageKey = AlgorithmStorageKey | CacheKey | TagTootsCategory;
/** Possible uniqufiiers for a class of ApiObjs. */
type ApiObjUniqueProperty = 'id' | 'name' | 'uri' | 'webfingerURI' | null;
/** Which property, if any, can serve as a uniquifier for rows stored at that ApiCacheKey. */
type UniqueIdProperties = Record<ApiCacheKey, ApiObjUniqueProperty>;

/** Utility types. */
export type IsNullable<T> = null extends T ? true : false;
export type IsUndefinedable<T> = undefined extends T ? true : false;
export type IsNullOrUndefined<T> = null extends T ? (undefined extends T ? true : false) : false;


///////////////////////////
//      Constants        //
///////////////////////////

export const ALL_ACTIONS = [
    ...Object.values(LoadAction),
    ...Object.values(LogAction),
] as const;

// Cache keys for the fediverse wide trending data
export const FEDIVERSE_CACHE_KEYS = [
    CacheKey.FEDIVERSE_POPULAR_SERVERS,
    CacheKey.FEDIVERSE_TRENDING_LINKS,
    CacheKey.FEDIVERSE_TRENDING_TAGS,
    CacheKey.FEDIVERSE_TRENDING_TOOTS,
];

// Objects fetched with these keys need to be built into proper Toot objects.
export const STORAGE_KEYS_WITH_TOOTS = Object.entries(CacheKey).reduce(
    (keys, [k, v]) => k.endsWith('_TOOTS') ? keys.concat(v) : keys,
    [AlgorithmStorageKey.TIMELINE_TOOTS] as StorageKey[]
).concat(Object.values(TagTootsCategory));

// Objects fetched with these keys need to be built into proper Account objects.
export const STORAGE_KEYS_WITH_ACCOUNTS: StorageKey[] = Object.entries(CacheKey).reduce(
    (keys, [k, v]) => (k == 'FOLLOWERS' || k.endsWith('_ACCOUNTS')) ? keys.concat(v) : keys,
    [] as StorageKey[]
);

// The property that can be used to uniquely identify objects stored at that ApiCacheKey.
export const UNIQUE_ID_PROPERTIES: UniqueIdProperties = {
    ...STORAGE_KEYS_WITH_TOOTS.reduce(
        (dict, key) => {
            dict[key as ApiCacheKey] = 'uri';
            return dict;
        },
        {} as UniqueIdProperties
    ),
    ...STORAGE_KEYS_WITH_ACCOUNTS.reduce(
        (dict, key) => {
            dict[key as ApiCacheKey] = 'webfingerURI'; // Accounts have a 'webfingerURI' property
            return dict;
        },
        {} as UniqueIdProperties
    ),
    [CacheKey.FOLLOWED_TAGS]: 'name', // Followed tags have a 'name' property
    [CacheKey.NOTIFICATIONS]: 'id',
    [CacheKey.SERVER_SIDE_FILTERS]: 'id', // Filters have an 'id' property
} as const;

export const ALL_CACHE_KEYS = [...Object.values(CacheKey), ...Object.values(TagTootsCategory)] as const;
export const CONVERSATION = 'conversation';
export const JUST_MUTING = "justMuting"; // TODO: Ugly hack used in the filter settings to indicate that the user is just muting this toot
export const TOOT_SOURCES = [...STORAGE_KEYS_WITH_TOOTS, CONVERSATION, JUST_MUTING] as const;


///////////////////////////////
//      Helper Methods       //
///////////////////////////////

// type ResponseRow<T extends ApiObj> = T extends mastodon.v1.Status
//     ? Toot
//     : (T extends mastodon.v1.Account ? Account : T);

type CachedByKey<K extends string, T, U extends Optional<Record<K, T>>> =
    U extends null
        ? Record<ApiCacheKey, T>
        : Record<ApiCacheKey | K, T>;

/**
 * Build a dictionary of values for each ApiCacheKey using the provided function.
 * @private
 * @template K
 * @template T
 * @param {(key?: ApiCacheKey) => T} fxn - Function to generate a value for each key.
 * @param {Record<K, T>} [initialDict] - Optional initial dictionary to extend (default={}).
 * @param {ApiCacheKey[]} [keys] - Optional list of keys to use (defaults to ALL_CACHE_KEYS).
 * @returns {Record<ApiCacheKey, T>} Dictionary of values by cache key.
 */
export function buildCacheKeyDict<K extends string, T, U extends Optional<Record<K, T>>>(
    fxn: (key?: ApiCacheKey) => T,
    initialDict?: Optional<Record<K, T>>,
    keys?: (ApiCacheKey)[],
): CachedByKey<K, T, U> {
    keys ??= ALL_CACHE_KEYS as ApiCacheKey[];

    return keys.reduce(
        (dict, key) => {
            dict[key] = fxn(key);
            return dict;
        },
        (initialDict ?? {}) as Record<ApiCacheKey | K, T>
    );
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


/** True if argument is a member of CacheKey. */
export const isCacheKey = isValueInStringEnum(CacheKey);
/** True if argument is a member of TagTootsCacheKey. */
export const isTagTootsCacheKey = isValueInStringEnum(TagTootsCategory);

/** True if argument is a member of NonScoreWeightName enum. */
export const isNonScoreWeightName = isValueInStringEnum(NonScoreWeightName);
/** True if argument is a member of ScoreName enum. */
export const isScoreName = isValueInStringEnum(ScoreName);
/** True if argument is a member of TypeFilterName enum. */
export const isTypeFilterName = isValueInStringEnum(TypeFilterName);
/** True if argument is a member of ScoreName or NonScoreWeightName enums. */
export const isWeightName = (str: string) => isScoreName(str) || isNonScoreWeightName(str);
