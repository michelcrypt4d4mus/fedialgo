import Account from "./api/objects/account";
import UserData from "./api/user_data";
import { type FeedFilterSettings, type StorableObj, type StorableObjWithCache, type TrendingData, type Weights } from "./types";
export declare enum CacheKey {
    BLOCKED_ACCOUNTS = "BlockedAccounts",
    FAVOURITED_TOOTS = "FavouritedToots",
    FAVOURITED_HASHTAG_TOOTS = "FavouritedHashtagToots",
    FEDIVERSE_POPULAR_SERVERS = "FediversePopularServers",
    FEDIVERSE_TRENDING_TAGS = "FediverseTrendingTags",
    FEDIVERSE_TRENDING_LINKS = "FediverseTrendingLinks",
    FEDIVERSE_TRENDING_TOOTS = "FediverseTrendingToots",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    HASHTAG_TOOTS = "HashtagToots",
    HOME_TIMELINE_TOOTS = "HomeTimelineToots",
    MUTED_ACCOUNTS = "MutedAccounts",
    NOTIFICATIONS = "Notifications",
    PARTICIPATED_TAG_TOOTS = "ParticipatedHashtagToots",
    RECENT_USER_TOOTS = "RecentUserToots",
    SERVER_SIDE_FILTERS = "ServerFilters",
    TIMELINE_TOOTS = "TimelineToots",
    TRENDING_TAG_TOOTS = "TrendingTagToots"
}
export declare enum AlgorithmStorageKey {
    APP_OPENS = "AppOpens",
    FILTERS = "Filters",
    USER = "FedialgoUser",
    WEIGHTS = "Weights"
}
type StorageKey = AlgorithmStorageKey | CacheKey;
type StorableObjWithStaleness = {
    isStale: boolean;
    obj: StorableObjWithCache;
    updatedAt: Date;
};
export declare const STORAGE_KEYS_WITH_TOOTS: StorageKey[];
export declare const STORAGE_KEYS_WITH_ACCOUNTS: StorageKey[];
export default class Storage {
    static clearAll(): Promise<void>;
    static get(key: StorageKey): Promise<StorableObj | null>;
    static getCoerced<T>(key: CacheKey): Promise<T[]>;
    static getFilters(): Promise<FeedFilterSettings | null>;
    static getIfNotStale<T extends StorableObjWithCache>(key: CacheKey): Promise<T | null>;
    static getTrendingData(): Promise<TrendingData>;
    static getWeights(): Promise<Weights>;
    static getWithStaleness(key: CacheKey): Promise<StorableObjWithStaleness | null>;
    static isDataStale(key: CacheKey): Promise<boolean>;
    static loadUserData(): Promise<UserData>;
    static logAppOpen(user: Account): Promise<void>;
    static remove(key: StorageKey): Promise<void>;
    static set(key: StorageKey, value: StorableObj): Promise<void>;
    static setFilters(filters: FeedFilterSettings): Promise<void>;
    static setWeightings(userWeightings: Weights): Promise<void>;
    static storedObjsInfo(): Promise<Record<string, any>>;
    private static buildKey;
    private static deserialize;
    private static getIdentity;
    private static getNumAppOpens;
    private static getStorableWithTimestamp;
    private static secondsSinceLastUpdated;
    private static secondsSinceMostRecentToot;
    private static serialize;
    private static setIdentity;
    private static updatedAt;
}
export {};
