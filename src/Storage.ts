/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { isFinite } from "lodash";
import { mastodon } from "masto";

import Account from "./api/objects/account";
import MastoApi from "./api/api";
import TagList from "./api/tag_list";
import Toot, { mostRecentTootedAt } from './api/objects/toot';
import UserData from "./api/user_data";
import { ageInMinutes, ageInSeconds } from "./helpers/time_helpers";
import { buildFiltersFromArgs, repairFilterSettings } from "./filters/feed_filters";
import { BytesDict, sizeFromTextEncoder } from "./helpers/math_helper";
import { byteString, FEDIALGO, toLocaleInt } from "./helpers/string_helpers";
import { checkUniqueRows, zipPromiseCalls } from "./helpers/collection_helpers";
import { config } from "./config";
import { DEFAULT_WEIGHTS } from "./scorer/weight_presets";
import { isDebugMode, isDeepDebug } from "./helpers/environment_helpers";
import { Logger } from './helpers/logger';
import { sizeOf } from "./helpers/math_helper";
import {
    AlgorithmStorageKey,
    CacheKey,
    FediverseCacheKey,
    TagTootsCategory,
    TrendingType,
    STORAGE_KEYS_WITH_ACCOUNTS,
    STORAGE_KEYS_WITH_TOOTS,
    type ApiCacheKey,
    type StorageKey,
    isApiCacheKey,
} from "./enums";
import {
    type ApiObj,
    type CacheableApiObj,
    type CacheTimestamp,
    type FeedFilterSettings,
    type FeedFilterSettingsSerialized,
    type MastodonInstances,
    type StorableObj,
    type StorableWithTimestamp,
    type StringNumberDict,
    type TagWithUsageCounts,
    type TrendingLink,
    type TrendingData,
    type WeightName,
    type Weights,
} from "./types";

// Configure localForage to use WebSQL as the driver
localForage.config({
    name        : FEDIALGO,
    storeName   : `${FEDIALGO}_user_data`,
});

interface StorableObjWithStaleness extends CacheTimestamp {
    obj: CacheableApiObj,
};

const logger = new Logger('STORAGE');


export default class Storage {
    static lastUpdatedAt: Date | null = null;  // Last time the storage was updated

    /** Clear everything but preserve the user's identity and weightings. */
    static async clearAll(): Promise<void> {
        logger.log(`Clearing all storage...`);
        const user = await this.getIdentity();
        const weights = await this.getWeights();
        const releasers = await MastoApi.instance.lockAllMutexes();

        try {
            await localForage.clear();

            if (user) {
                logger.log(`Cleared storage for user ${user.webfingerURI}, keeping weights:`, weights);
                await this.setIdentity(user);
                if (weights) await this.setWeightings(weights);
            } else {
                logger.warn(`No user identity found, cleared storage anyways`);
            }
        } finally {
            releasers.forEach((release) => release());
            logger.log(`Cleared all storage items, released mutexes`);
        }
    }

    /** Get the value at the given key (with the user ID as a prefix). */
    static async get(key: StorageKey): Promise<StorableObj | null> {
        const withTimestamp = await this.getStorableWithTimestamp(key);

        if (!withTimestamp) {
            return null;
        } else if (!withTimestamp.updatedAt) {
            // TODO: remove this logic eventually, it's only for upgrading existing users
            // Code to handle upgrades of existing users who won't have the updatedAt / value format in browser storage
            logger.warn(`No updatedAt found for "${key}", likely due to a fedialgo upgrade. Clearing cache.`);
            await this.remove(key);
            return null;
        }

        return this.deserialize(key, withTimestamp.value);
    }

    /** Get the value at the given key but coerced to an empty array if there's nothing there. */
    static async getCoerced<T>(key: CacheKey | FediverseCacheKey | AlgorithmStorageKey.TIMELINE_TOOTS): Promise<T[]> {
        let value = await this.get(key);

        if (!value) {
            value = [];
        } else if (!Array.isArray(value)) {
            logger.logAndThrowError(`Expected array at '${key}' but got`, value);
        }

        return value as T[];
    }

    /** Get the user's saved timeline filter settings. */
    static async getFilters(): Promise<FeedFilterSettings | null> {
        const filters = await this.get(AlgorithmStorageKey.FILTERS) as FeedFilterSettings;
        if (!filters) return null;

        try {
            if (repairFilterSettings(filters)) {
                logger.warn(`Repaired old filter settings, updating...`);
                await this.set(AlgorithmStorageKey.FILTERS, filters);
            }
        } catch (e) {
            logger.error(`Error repairing filter settings, returning null:`, e);
            await this.remove(AlgorithmStorageKey.FILTERS);
            return null;
        }

        logger.debug(`getFilters() loaded filters from storage:`, filters);
        // Filters are saved in a serialized format that requires deserialization
        return buildFiltersFromArgs(filters);
    }

    /** Return null if the data in storage is stale or doesn't exist. */
    static async getIfNotStale<T extends CacheableApiObj>(key: ApiCacheKey): Promise<T | null> {
        const withStaleness = await this.getWithStaleness(key);

        if (!withStaleness || withStaleness.isStale) {
            return null;
        } else {
            return withStaleness.obj as T;
        }
    }

    /** Get trending tags, toots, and links as a single TrendingData object. */
    static async getTrendingData(): Promise<TrendingData> {
        const servers = (await this.get(FediverseCacheKey.POPULAR_SERVERS)) || {};
        const trendingTags = await this.getCoerced<TagWithUsageCounts>(FediverseCacheKey.TRENDING_TAGS)

        return {
            [TrendingType.LINKS]: await this.getCoerced<TrendingLink>(FediverseCacheKey.TRENDING_LINKS),
            [TrendingType.SERVERS]: servers as MastodonInstances,
            [TrendingType.TAGS]: new TagList(trendingTags, TagTootsCategory.TRENDING),
            toots: await this.getCoerced<Toot>(FediverseCacheKey.TRENDING_TOOTS),
        };
    }

    /** Return the user's stored timeline weightings or the default weightings if none are found. */
    static async getWeights(): Promise<Weights> {
        const weights = await this.get(AlgorithmStorageKey.WEIGHTS) as Weights;
        if (!weights) return JSON.parse(JSON.stringify(DEFAULT_WEIGHTS)) as Weights;
        let shouldSave = false;

        // If there are stored weights set any missing values to the default (possible in case of upgrades)
        Object.entries(DEFAULT_WEIGHTS).forEach(([key, defaultValue]) => {
            const value = weights[key as WeightName]

            if (!isFinite(value)) {
                logger.warn(`Missing value for "${key}" in saved weights, setting to default: ${defaultValue}`);
                weights[key as WeightName] = DEFAULT_WEIGHTS[key as WeightName];
                shouldSave = true;
            }
        });

        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSave) {
            logger.log(`Saving repaired user weights:`, weights);
            await Storage.setWeightings(weights);
        }

        return weights;
    }

    /** Get the value at the given key (with the user ID as a prefix) and return it with its staleness. */
    static async getWithStaleness(key: ApiCacheKey): Promise<StorableObjWithStaleness | null> {
        const hereLogger = logger.tempLogger(key, `getWithStaleness`);
        const withTimestamp = await this.getStorableWithTimestamp(key);

        if (!withTimestamp?.updatedAt) {
            hereLogger.deep(`No data found, returning null`);
            return null;
        };

        const dataAgeInMinutes = ageInMinutes(withTimestamp.updatedAt);
        const staleAfterMinutes = config.api.data[key]?.minutesUntilStale || config.api.minutesUntilStaleDefault;
        let minutesMsg = `(dataAgeInMinutes: ${toLocaleInt(dataAgeInMinutes)}`;
        minutesMsg += `, staleAfterMinutes: ${toLocaleInt(staleAfterMinutes)})`;
        let isStale = false;

        if (dataAgeInMinutes > staleAfterMinutes) {
            hereLogger.trace(`Data is stale ${minutesMsg}`);
            isStale = true;
        } else {
            let msg = `Cached data is still fresh ${minutesMsg}`;
            msg += Array.isArray(withTimestamp.value) ? ` (${withTimestamp.value.length} records)` : '';
            hereLogger.trace(msg);
        }

        // Check for unique IDs in the stored data if we're in debug mode
        if (isDebugMode) {
            checkUniqueRows(key, withTimestamp.value as ApiObj[], hereLogger);
        }

        return {
            isStale,
            obj: this.deserialize(key, withTimestamp.value) as CacheableApiObj,
            updatedAt: new Date(withTimestamp.updatedAt),
        }
    }

    /** Return true if the data stored at 'key' either doesn't exist or is stale and should be refetched. */
    static async isDataStale(key: CacheKey): Promise<boolean> {
        return !(await this.getIfNotStale(key));
    }

    /** Build a UserData object from the user's cached followed accounts, tags, blocks, etc. */
    static async loadUserData(): Promise<UserData> {
        // TODO: unify blocked and muted account logic?
        const blockedAccounts = await this.getCoerced<mastodon.v1.Account>(CacheKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.getCoerced<mastodon.v1.Account>(CacheKey.MUTED_ACCOUNTS);

        return UserData.buildFromData({
            blockedDomains: await this.getCoerced<string>(CacheKey.BLOCKED_DOMAINS),
            favouritedToots: await this.getCoerced<Toot>(CacheKey.FAVOURITED_TOOTS),
            followedAccounts: await this.getCoerced<Account>(CacheKey.FOLLOWED_ACCOUNTS),
            followedTags: await this.getCoerced<mastodon.v1.Tag>(CacheKey.FOLLOWED_TAGS),
            mutedAccounts: mutedAccounts.concat(blockedAccounts).map((a) => Account.build(a)),
            recentToots: await this.getCoerced<Toot>(CacheKey.RECENT_USER_TOOTS),  // TODO: maybe expensive to recompute this every time; we store a lot of user toots
            serverSideFilters: await this.getCoerced<mastodon.v2.Filter>(CacheKey.SERVER_SIDE_FILTERS),
        });
    }

    /** Record a new instantiation of TheAlgorithm. Currently more or less unused. */
    static async logAppOpen(user: Account): Promise<void> {
        await Storage.setIdentity(user);
        const numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(AlgorithmStorageKey.APP_OPENS, numAppOpens);
    }

    /** Delete the value at the given key (with the user ID as a prefix). */
    static async remove(key: StorageKey): Promise<void> {
        const storageKey = key == AlgorithmStorageKey.USER ? key : await this.buildKey(key);
        logger.log(`Removing value at key: ${storageKey}`);
        await localForage.removeItem(storageKey);
    }

    /** Set the value at the given key (with the user ID as a prefix). */
    static async set(key: StorageKey, value: StorableObj): Promise<void> {
        const hereLogger = logger.tempLogger(key, `set()`);
        const storageKey = await this.buildKey(key);
        const updatedAt = new Date();

        const storableValue = this.serialize(key, value);
        const withTimestamp: StorableWithTimestamp = {updatedAt: updatedAt.toISOString(), value: storableValue};
        const msg = `Updating cache with ` + (Array.isArray(value) ? `${value.length} records` : `an object`);
        isDeepDebug ? hereLogger.deep(msg, withTimestamp) : hereLogger.trace(msg);
        await localForage.setItem(storageKey, withTimestamp);

        if (isApiCacheKey(key)) {
            this.lastUpdatedAt = updatedAt;
        } else {
            hereLogger.deep(`"${key}" is not an API cache key, not updating lastUpdatedAt`);
        }
    }

    /** Serialize and save the FeedFilterSettings object. */
    static async setFilters(filters: FeedFilterSettings): Promise<void> {
        const filterSettings: FeedFilterSettingsSerialized = {
            booleanFilterArgs: Object.values(filters.booleanFilters).map(filter => filter.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        };

        await this.set(AlgorithmStorageKey.FILTERS, filterSettings);
    }

    /** Save user's weights. */
    static async setWeightings(userWeightings: Weights): Promise<void> {
        await this.set(AlgorithmStorageKey.WEIGHTS, userWeightings);
    }

    /** Returns metadata about whatever is stored in localForage. */
    static async storedObjsInfo(): Promise<Record<string, unknown>> {
        const keyStrings = Object.values(CacheKey);
        const keys = await Promise.all(keyStrings.map(k => this.buildKey(k as CacheKey)));
        const storedData = await zipPromiseCalls(keys, async (k) => localForage.getItem(k));
        storedData[AlgorithmStorageKey.USER] = await this.getIdentity(); // Stored differently
        let totalBytes = 0;

        const detailedInfo = Object.entries(storedData).reduce(
            (info, [key, obj]) => {
                if (obj) {
                    const value = key == AlgorithmStorageKey.USER ? obj : (obj as StorableWithTimestamp).value;
                    const sizes = new BytesDict();
                    const sizeInBytes = sizeOf(value, sizes);
                    totalBytes += sizeInBytes;

                    info[key] = {
                        bytes: sizeInBytes,
                        bytesStr: byteString(sizeInBytes),
                        sizeOfByType: sizes.toBytesStringDict(),  // kind of janky way to find out what % of storage is numbers, strings, etc.
                        sizeFromTextEncoder: sizeFromTextEncoder(value),
                    }

                    if (Array.isArray(value)) {
                        info[key]!.numElements = value.length;
                        info[key]!.type = 'array';
                    } else if (typeof value === 'object') {
                        info[key]!.numKeys = Object.keys(value).length;
                        info[key]!.type = 'object';
                    } else {
                        logger.warn(`Unknown type for key "${key}":`, value);
                    }
                } else {
                    info[key] = null;
                }

                return info;
            },
            {} as Record<string, any>
        );

        detailedInfo.totalBytes = totalBytes;
        detailedInfo.totalBytesStr = byteString(totalBytes);

        // Compute summary stats that are easier to read
        const summary = Object.entries(detailedInfo).reduce(
            (summary, [key, value]) => {
                if (key.startsWith(MastoApi.instance.user.id) && value?.numElements) {
                    summary[key.split('_')[1] + 'NumRows'] = value.numElements;
                }

                return summary;  // Only include storage for this user
            },
            {} as StringNumberDict
        );

        return { detailedInfo, lastUpdatedAt: this.lastUpdatedAt, summary };
    }

    //////////////////////////////
    //     Private methods      //
    //////////////////////////////

    // Build a string that prepends the user ID to the key
    private static async buildKey(key: StorageKey): Promise<string> {
        let user = await this.getIdentity();

        if (!user) {
            logger.warn(`No user identity found, checking MastoApi...`);

            if (MastoApi.instance.user) {
                logger.warn(`No user identity found! MastoApi has a user ID, using that instead`);
                user = MastoApi.instance.user;
                await this.setIdentity(user);
            } else {
                logger.logAndThrowError(`No user identity found and failed to build key for "${key}"`);
            }
        }

        return `${user!.id}_${key}`;
    }

    private static deserialize(key: StorageKey, value: StorableObj): StorableObj {
        if (STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            return plainToInstance(Account, value);
        } else if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            return plainToInstance(Toot, value);
        } else {
            return value;
        }
    }

    // Get the user identity from storage
    private static async getIdentity(): Promise<Account | null> {
        const user = await localForage.getItem(AlgorithmStorageKey.USER);
        return user ? plainToInstance(Account, user) : null;
    }

    // Get the number of times the app has been opened by this user
    private static async getNumAppOpens(): Promise<number> {
        return (await this.get(AlgorithmStorageKey.APP_OPENS) as number) ?? 0;
    }

    // Get the raw StorableWithTimestamp object
    private static async getStorableWithTimestamp(key: StorageKey): Promise<StorableWithTimestamp | null> {
        const withTimestamp = await localForage.getItem(await this.buildKey(key)) as StorableWithTimestamp;
        return withTimestamp ?? null;
    }

    // Return the seconds from the updatedAt stored at 'key' and now
    private static async secondsSinceLastUpdated(key: StorageKey): Promise<number | null> {
        const updatedAt = await this.updatedAt(key);
        return updatedAt ? ageInSeconds(updatedAt) : null;
    }

    // Return the number of seconds since the most recent toot in the stored timeline   // TODO: unused
    private static async secondsSinceMostRecentToot(): Promise<number | null> {
        const timelineToots = await this.get(AlgorithmStorageKey.TIMELINE_TOOTS);
        if (!timelineToots) return null;
        const mostRecent = mostRecentTootedAt(timelineToots as Toot[]);

        if (mostRecent) {
            return ageInSeconds(mostRecent.getTime());
        } else {
            logger.debug(`No most recent toot found`);
            return null;
        }
    }

    private static serialize(key: StorageKey, value: StorableObj): StorableObj {
        if (STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            return instanceToPlain(value);
        } else if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            return instanceToPlain(value);
        } else {
            return value;
        }
    }

    // Store the fedialgo user's Account object
    // TODO: the storage key is not prepended with the user ID (maybe that's OK?)
    private static async setIdentity(user: Account) {
        logger.trace(`Setting fedialgo user identity to:`, user);
        await localForage.setItem(AlgorithmStorageKey.USER, instanceToPlain(user));
    }

    private static async updatedAt(key: StorageKey): Promise<Date | null> {
        const withTimestamp = await this.getStorableWithTimestamp(key);
        return withTimestamp?.updatedAt ? new Date(withTimestamp.updatedAt) : null;
    }
};
