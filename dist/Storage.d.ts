import Account from "./api/objects/account";
import UserData from "./api/user_data";
import { CacheKey, FeedFilterSettings, StorableObj, StorableObjWithCache, StorageKey, TrendingData, Weights } from "./types";
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
