import Account from "./api/objects/account";
import UserData from "./api/user_data";
import { CacheKey, type ApiCacheKey, type StorageKey } from "./enums";
import { type CacheableApiObj, type CacheTimestamp, type FeedFilterSettings, type StorableObj, type TrendingData, type Weights } from "./types";
interface StorableObjWithStaleness extends CacheTimestamp {
    obj: CacheableApiObj;
}
export default class Storage {
    static lastUpdatedAt: Date | null;
    /** Clear everything but preserve the user's identity and weightings. */
    static clearAll(): Promise<void>;
    /** Get the value at the given key (with the user ID as a prefix). */
    static get(key: StorageKey): Promise<StorableObj | null>;
    /** Get the value at the given key but coerced to an empty array if there's nothing there. */
    static getCoerced<T>(key: CacheKey): Promise<T[]>;
    /** Get the user's saved timeline filter settings. */
    static getFilters(): Promise<FeedFilterSettings | null>;
    /** Return null if the data in storage is stale or doesn't exist. */
    static getIfNotStale<T extends CacheableApiObj>(key: ApiCacheKey): Promise<T | null>;
    /** Get trending tags, toots, and links as a single TrendingData object. */
    static getTrendingData(): Promise<TrendingData>;
    /** Return the user's stored timeline weightings or the default weightings if none are found. */
    static getWeights(): Promise<Weights>;
    /** Get the value at the given key (with the user ID as a prefix) and return it with its staleness. */
    static getWithStaleness(key: ApiCacheKey): Promise<StorableObjWithStaleness | null>;
    /** Return true if the data stored at 'key' either doesn't exist or is stale and should be refetched. */
    static isDataStale(key: CacheKey): Promise<boolean>;
    /** Build a UserData object from the user's cached followed accounts, tags, blocks, etc. */
    static loadUserData(): Promise<UserData>;
    /** Record a new instantiation of TheAlgorithm. Currently more or less unused. */
    static logAppOpen(user: Account): Promise<void>;
    /** Delete the value at the given key (with the user ID as a prefix). */
    static remove(key: StorageKey): Promise<void>;
    /** Set the value at the given key (with the user ID as a prefix). */
    static set(key: StorageKey, value: StorableObj): Promise<void>;
    /** Serialize and save the FeedFilterSettings object. */
    static setFilters(filters: FeedFilterSettings): Promise<void>;
    /** Save user's weights. */
    static setWeightings(userWeightings: Weights): Promise<void>;
    /** Returns metadata about whatever is stored in localForage. */
    static storedObjsInfo(): Promise<Record<string, unknown>>;
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
