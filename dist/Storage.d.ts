import Account from "./api/objects/account";
import UserData from "./api/user_data";
import { AlgorithmStorageKey, CacheKey, TagTootsCacheKey, type ApiCacheKey } from "./enums";
import { type FeedFilterSettings, type StorableObj, type CacheableApiObj, type TrendingData, type Weights } from "./types";
export interface CacheTimestamp {
    isStale: boolean;
    updatedAt: Date;
}
interface StorableObjWithStaleness extends CacheTimestamp {
    obj: CacheableApiObj;
}
type StorageKey = AlgorithmStorageKey | CacheKey | TagTootsCacheKey;
export declare const STORAGE_KEYS_WITH_TOOTS: StorageKey[];
export declare const STORAGE_KEYS_WITH_ACCOUNTS: StorageKey[];
export declare const STORAGE_KEYS_WITH_UNIQUE_IDS: StorageKey[];
export default class Storage {
    static lastUpdatedAt: Date | null;
    static clearAll(): Promise<void>;
    static get(key: StorageKey): Promise<StorableObj | null>;
    static getCoerced<T>(key: CacheKey): Promise<T[]>;
    static getFilters(): Promise<FeedFilterSettings | null>;
    static getIfNotStale<T extends CacheableApiObj>(key: ApiCacheKey): Promise<T | null>;
    static getTrendingData(): Promise<TrendingData>;
    static getWeights(): Promise<Weights>;
    static getWithStaleness(key: ApiCacheKey): Promise<StorableObjWithStaleness | null>;
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
