/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { mastodon } from "masto";

import Account from "./api/objects/account";
import MastoApi from "./api/api";
import Toot, { mostRecentTootedAt } from './api/objects/toot';
import UserData from "./api/user_data";
import { ageInSeconds } from "./helpers/time_helpers";
import { buildFiltersFromArgs } from "./filters/feed_filters";
import { byteString, FEDIALGO, toLocaleInt } from "./helpers/string_helpers";
import { checkUniqueIDs, zipPromises } from "./helpers/collection_helpers";
import { Config } from "./config";
import { DEFAULT_WEIGHTS } from "./scorer/weight_presets";
import { isDebugMode } from "./helpers/environment_helpers";
import { logAndThrowError, traceLog } from './helpers/log_helpers';
import {
    FeedFilterSettings,
    FeedFilterSettingsSerialized,
    MastodonObjWithID,
    StorableObj,
    StorableObjWithCache,
    StorableWithTimestamp,
    StorageKey,
    TagWithUsageCounts,
    TrendingLink,
    TrendingStorage,
    WeightName,
    Weights,
} from "./types";

// The cache values at these keys contain SerializedToot objects
export const STORAGE_KEYS_WITH_TOOTS = [
    StorageKey.FEDIVERSE_TRENDING_TOOTS,
    StorageKey.HASHTAG_TOOTS,
    StorageKey.HOME_TIMELINE,
    StorageKey.PARTICIPATED_TAG_TOOTS,
    StorageKey.TIMELINE,
    StorageKey.TRENDING_TAG_TOOTS,
    // These don't have completeProperties, but they are still toots
    StorageKey.FAVOURITED_TOOTS,   // TODO: should probably be in STORAGE_KEYS_WITH_TOOTS
    StorageKey.RECENT_USER_TOOTS,  // TODO: should probably be in STORAGE_KEYS_WITH_TOOTS
];

export const STORAGE_KEYS_WITH_ACCOUNTS = [
    StorageKey.BLOCKED_ACCOUNTS,
    StorageKey.FOLLOWED_ACCOUNTS,
    StorageKey.MUTED_ACCOUNTS,
];

const STORAGE_KEYS_WITH_UNIQUE_IDS = [
    ...STORAGE_KEYS_WITH_TOOTS,
    ...STORAGE_KEYS_WITH_ACCOUNTS,
    StorageKey.RECENT_NOTIFICATIONS,
    StorageKey.SERVER_SIDE_FILTERS,
]

const LOG_PREFIX = '[STORAGE]';
const buildLogMsg = (s: string) => `${LOG_PREFIX} ${s}`;
const log = (s: string, ...args: any[]) => console.log(buildLogMsg(s), ...args);
const warn = (s: string, ...args: any[]) => console.warn(buildLogMsg(s), ...args);
const debug = (s: string, ...args: any[]) => console.debug(buildLogMsg(s), ...args);
const trace = (s: string, ...args: any[]) => traceLog(buildLogMsg(s), ...args);

// Configure localForage to use WebSQL as the driver
localForage.config({
    name        : FEDIALGO,
    storeName   : `${FEDIALGO}_user_data`,
});


export default class Storage {
    // Clear everything but preserve the user's identity and weightings
    static async clearAll(): Promise<void> {
        log(`Clearing all storage...`);
        const user = await this.getIdentity();
        const weights = await this.getWeights();
        await localForage.clear();

        if (user) {
            log(`Cleared storage for user ${user.webfingerURI}, keeping weights:`, weights);
            await this.setIdentity(user);
            if (weights) await this.setWeightings(weights);
        } else {
            warn(`No user identity found, cleared storage anyways`);
        }
    }

    // Dump information about the size of the data stored in localForage
    static async dumpData(): Promise<void> {
        const keyStrings = Object.values(StorageKey);
        const keys = await Promise.all(keyStrings.map(k => this.buildKey(k as StorageKey)));
        const storedData = await zipPromises(keys, async (k) => localForage.getItem(k));

        const storageInfo = Object.entries(storedData).reduce(
            (info, [key, obj]) => {
                // info[key] = {
                //     bytes: value ? byteString(JSON.stringify(value).length) : null,
                //     numElements: value && Array.isArray(value) ? value.length : null,
                // }

                if (obj) {
                    const value = (obj as StorableWithTimestamp).value;
                    info[key] = byteString(JSON.stringify(value).length);

                    if (Array.isArray(value)) {
                        info[key] += ` (${value.length} items)`;
                    } else {
                        info[key] += ` (not an array)`;
                    }
                } else {
                    info[key] = null;
                }

                return info;
            },
            {} as Record<string, string | null>,
        );

        console.log(`${LOG_PREFIX} Storage info:`, storageInfo);
    }

    // Get the value at the given key (with the user ID as a prefix)
    static async get(key: StorageKey): Promise<StorableObj | null> {
        const withTimestamp = await this.getStorableWithTimestamp(key);

        if (!withTimestamp) {
            return null;
        } else if (!withTimestamp.updatedAt) {
            // TODO: remove this logic eventually, it's only for upgrading existing users
            // Code to handle upgrades of existing users who won't have the updatedAt / value format in browser storage
            warn(`No updatedAt found for "${key}", likely due to a fedialgo upgrade. Clearing cache.`);
            await this.remove(key);
            return null;
        }

        return this.deserialize(key, withTimestamp.value);
    }

    // Return null if the data is in storage is stale or doesn't exist
    static async getIfNotStale<T extends StorableObjWithCache>(key: StorageKey): Promise<T | null> {
        const logPrefix = `getIfNotStale("${key}"):`;
        const withTimestamp = await this.getStorableWithTimestamp(key);

        if (!withTimestamp?.updatedAt) {
            traceLog(`${logPrefix} No data found, returning null`);
            return null;
        };

        const staleAfterSeconds = Config.staleDataSeconds[key] ?? Config.staleDataDefaultSeconds;
        const dataAgeInSeconds = ageInSeconds(withTimestamp.updatedAt);
        let secondsLogMsg = `(dataAgeInSeconds: ${toLocaleInt(dataAgeInSeconds)}`;
        secondsLogMsg += `, staleAfterSeconds: ${toLocaleInt(staleAfterSeconds)})`;

        if (dataAgeInSeconds > staleAfterSeconds) {
            log(`${logPrefix} Data is stale ${secondsLogMsg}`);
            return null;
        }

        let msg = `Cached data is still fresh ${secondsLogMsg}`;
        if (Array.isArray(withTimestamp.value)) msg += ` (${withTimestamp.value.length} records)`;
        trace(`${logPrefix} ${msg}`);

        // Check for unique IDs in the stored data if we're in debug mode
        if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(key) && isDebugMode) {
            checkUniqueIDs(withTimestamp.value as MastodonObjWithID[], key);
        }

        return this.deserialize(key, withTimestamp.value) as T;
    }

    // Get the value at the given key (with the user ID as a prefix) but coerce it to an array if there's nothing there
    static async getCoerced<T>(key: StorageKey): Promise<T[]> {
        let value = await this.get(key);

        if (!value) {
            value = [];
        } else if (!Array.isArray(value)) {
            logAndThrowError(`${LOG_PREFIX} Expected array at '${key}' but got`, value);
        }

        return value as T[];
    }

    // Get the user's saved timeline filter settings
    static async getFilters(): Promise<FeedFilterSettings | null> {
        const filters = await this.get(StorageKey.FILTERS) as FeedFilterSettings;
        // Filters are saved in a serialized format that requires deserialization
        return filters ? buildFiltersFromArgs(filters) : null;
    }

    // Get trending tags, toots, and links as a single TrendingStorage object
    static async getTrendingData(): Promise<TrendingStorage> {
        return {
            links: await this.getCoerced<TrendingLink>(StorageKey.FEDIVERSE_TRENDING_LINKS),
            tags: await this.getCoerced<TagWithUsageCounts>(StorageKey.FEDIVERSE_TRENDING_TAGS),
            toots: await this.getCoerced<Toot>(StorageKey.FEDIVERSE_TRENDING_TOOTS),
        };
    }

    // Return the user's stored timeline weightings or the default weightings if none are found
    static async getWeights(): Promise<Weights> {
        let weights = await this.get(StorageKey.WEIGHTS) as Weights;
        if (!weights) return {...DEFAULT_WEIGHTS} as Weights;
        let shouldSave = false;

        // If there are stored weights set any missing values to the default (possible in case of upgrades)
        Object.entries(DEFAULT_WEIGHTS).forEach(([key, defaultValue]) => {
            const value = weights[key as WeightName]

            if (!value && value !== 0) {
                warn(`Missing value for "${key}" in saved weights, setting to default: ${defaultValue}`);
                weights[key as WeightName] = DEFAULT_WEIGHTS[key as WeightName];
                shouldSave = true;
            }
        });

        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSave) {
            log(`Saving repaired user weights:`, weights);
            await Storage.setWeightings(weights);
        }

        return weights;
    }

    // Return true if the data stored at 'key' either doesn't exist or is stale and should be refetched
    static async isDataStale(key: StorageKey): Promise<boolean> {
        return !(await this.getIfNotStale(key));
    }

    // Get a collection of information about the user's followed accounts, tags, blocks, etc.
    static async loadUserData(): Promise<UserData> {
        // TODO: unify blocked and muted account logic?
        const blockedAccounts = await this.getCoerced<mastodon.v1.Account>(StorageKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.getCoerced<mastodon.v1.Account>(StorageKey.MUTED_ACCOUNTS);

        return UserData.buildFromData({
            favouritedToots: await this.getCoerced<Toot>(StorageKey.FAVOURITED_TOOTS),
            followedAccounts: await this.getCoerced<Account>(StorageKey.FOLLOWED_ACCOUNTS),
            followedTags: await this.getCoerced<mastodon.v1.Tag>(StorageKey.FOLLOWED_TAGS),
            mutedAccounts: mutedAccounts.concat(blockedAccounts).map((a) => Account.build(a)),
            recentToots: await this.getCoerced<Toot>(StorageKey.RECENT_USER_TOOTS),  // TODO: maybe expensive to recompute this every time; we store a lot of user toots
            serverSideFilters: await this.getCoerced<mastodon.v2.Filter>(StorageKey.SERVER_SIDE_FILTERS),
        });
    }

    static async logAppOpen(): Promise<void> {
        let numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(StorageKey.APP_OPENS, numAppOpens);
    }

    // Delete the value at the given key (with the user ID as a prefix)
    static async remove(key: StorageKey): Promise<void> {
        const storageKey = await this.buildKey(key);
        log(`Removing value at key: ${storageKey}`);
        await localForage.removeItem(storageKey);
    }

    // Set the value at the given key (with the user ID as a prefix)
    static async set(key: StorageKey, value: StorableObj): Promise<void> {
        const storageKey = await this.buildKey(key);
        const updatedAt = new Date().toISOString();
        const storableValue = this.serialize(key, value);
        const withTimestamp = {updatedAt, value: storableValue} as StorableWithTimestamp;
        trace(`Setting value at key: ${storageKey} to value:`, withTimestamp);
        await localForage.setItem(storageKey, withTimestamp);
    }

    // Serialize the FeedFilterSettings object
    static async setFilters(filters: FeedFilterSettings): Promise<void> {
        const filterSettings = {
            feedFilterSectionArgs: Object.values(filters.filterSections).map(section => section.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        } as FeedFilterSettingsSerialized;

        await this.set(StorageKey.FILTERS, filterSettings);
    }

    // Store the fedialgo user's Account object
    // TODO: the storage key is not prepended with the user ID (maybe that's OK?)
    static async setIdentity(user: Account) {
        debug(`Setting fedialgo user identity to:`, user);
        await localForage.setItem(StorageKey.USER, instanceToPlain(user));
    }

    static async setWeightings(userWeightings: Weights): Promise<void> {
        await this.set(StorageKey.WEIGHTS, userWeightings);
    }

    //////////////////////////////
    //     Private methods      //
    //////////////////////////////

    // Build a string that prepends the user ID to the key
    private static async buildKey(key: StorageKey): Promise<string> {
        let user = await this.getIdentity();

        if (!user) {
            warn(`No user identity found, checking MastoApi...`);

            if (MastoApi.instance.user) {
                warn(`No user identity found! MastoApi has a user ID, using that instead`);
                user = MastoApi.instance.user;
                await this.setIdentity(user);
            } else {
                logAndThrowError(`${LOG_PREFIX} No user identity found! Cannot build key for ${key}`);
            }
        }

        return `${user.id}_${key}`;
    }

    private static deserialize(key: StorageKey, value: StorableObj): StorableObj {
        if (STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            // Calling the plainToInstance with arrays as argument directly may or may not have caused an issue
            if (Array.isArray(value)) {
                return value.map((t) => plainToInstance(Account, t));
            } else {
                warn(`Expected array of accounts at key "${key}", but got:`, value);
                return plainToInstance(Account, value);
            }
        } else if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            if (Array.isArray(value)) {
                return value.map((t) => plainToInstance(Toot, t));
            } else {
                warn(`Expected array of toots at key "${key}", but got:`, value);
                return plainToInstance(Toot, value);
            }
        } else {
            return value;
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

    // Get the user identity from storage
    private static async getIdentity(): Promise<Account | null> {
        const user = await localForage.getItem(StorageKey.USER);
        return user ? plainToInstance(Account, user) : null;
    }

    // Get the number of times the app has been opened by this user
    private static async getNumAppOpens(): Promise<number> {
        return (await this.get(StorageKey.APP_OPENS) as number) ?? 0;
    }

    // Get the raw StorableWithTimestamp object
    private static async getStorableWithTimestamp(key: StorageKey): Promise<StorableWithTimestamp | null> {
        const withTimestamp = await localForage.getItem(await this.buildKey(key)) as StorableWithTimestamp;
        return withTimestamp ?? null;
    }

    // Get the timestamp the app was last opened // TODO: currently unused
    private static async lastOpenedAt(): Promise<Date | null> {
        return await this.updatedAt(StorageKey.APP_OPENS);
    }

    // Return the seconds from the updatedAt stored at 'key' and now
    private static async secondsSinceLastUpdated(key: StorageKey): Promise<number | null> {
        const updatedAt = await this.updatedAt(key);
        return updatedAt ? ageInSeconds(updatedAt) : null;
    }

    private static async updatedAt(key: StorageKey): Promise<Date | null> {
        const withTimestamp = await this.getStorableWithTimestamp(key);
        return withTimestamp?.updatedAt ? new Date(withTimestamp.updatedAt) : null;
    }

    // Return the number of seconds since the most recent toot in the stored timeline   // TODO: unused
    private static async secondsSinceMostRecentToot(): Promise<number | null> {
        const timelineToots = await this.get(StorageKey.TIMELINE);
        if (!timelineToots) return null;
        const mostRecent = mostRecentTootedAt(timelineToots as Toot[]);

        if (mostRecent) {
            return ageInSeconds(mostRecent.getTime());
        } else {
            debug(`No most recent toot found`);
            return null;
        }
    }
};
