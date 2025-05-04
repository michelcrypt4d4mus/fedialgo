/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { mastodon } from "masto";

import Account from "./api/objects/account";
import Toot, { mostRecentTootedAt, SerializableToot } from './api/objects/toot';
import UserData from "./api/user_data";
import { ageInSeconds, quotedISOFmt } from "./helpers/time_helpers";
import { buildFiltersFromArgs } from "./filters/feed_filters";
import { Config, DEFAULT_CONFIG } from "./config";
import { toLocaleInt } from "./helpers/string_helpers";
import { logAndThrowError, traceLog } from './helpers/log_helpers';
import {
    FeedFilterSettings,
    FeedFilterSettingsSerialized,
    StorableObj,
    StorableWithTimestamp,
    StorageKey,
    TrendingLink,
    TrendingStorage,
    TrendingTag,
    Weights,
} from "./types";
import MastoApi from "./api/api";

// The cache values at these keys contain SerializedToot objects
export const STORAGE_KEYS_WITH_TOOTS = [
    StorageKey.FAVOURITED_TOOTS,  // Stores the toots that were favourited
    StorageKey.FEDIVERSE_TRENDING_TOOTS,
    StorageKey.PARTICIPATED_TAG_TOOTS,
    StorageKey.RECENT_USER_TOOTS,
    StorageKey.TIMELINE,
    StorageKey.TRENDING_TAG_TOOTS,
];

const LOG_PREFIX = '[STORAGE]';
const logMsg = (s: string) => `${LOG_PREFIX} ${s}`;
const log = (s: string, ...args: any[]) => console.log(logMsg(s), ...args);
const warn = (s: string, ...args: any[]) => console.warn(logMsg(s), ...args);
const debug = (s: string, ...args: any[]) => console.debug(logMsg(s), ...args);


export default class Storage {
    static config: Config = Object.assign({}, DEFAULT_CONFIG);

    // Clear everything but preserve the user's identity and weightings
    static async clearAll(): Promise<void> {
        log(`Clearing all storage...`);
        const user = await this.getIdentity();
        const weights = await this.getWeightings();
        await localForage.clear();

        if (user) {
            log(`Cleared storage for user ${user.webfingerURI}, keeping weights:`, weights);
            await this.setIdentity(user);
            if (weights) await this.setWeightings(weights);
        } else {
            warn(`No user identity found, cleared storage anyways`);
        }
    }

    // Get the value at the given key (with the user ID as a prefix)
    static async get(key: StorageKey): Promise<StorableObj | null> {
        const withTimestamp = await localForage.getItem(await this.buildKey(key)) as StorableWithTimestamp;

        if (!withTimestamp) {
            return null;
        } else if (!withTimestamp.updatedAt) {
            // Code to handle upgrades of existing users who won't have the updatedAt / value format in browser storage
            warn(`No updatedAt found for "${key}", likely due to a fedialgo upgrade. Clearing cache.`);
            await this.remove(key);
            return null;
        }

        return withTimestamp.value;
    }

    // Generic method for deserializing stored Accounts
    static async getAccounts(key: StorageKey): Promise<Account[] | null> {
        const accounts = await this.get(key) as mastodon.v1.Account[];
        return accounts ? accounts.map(t => new Account(t)) : null;
    }

    // TODO: This might not be the right place for this. Also should it be cached in the browser storage?
    static getConfig(): Config {
        return this.config;
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

    // Get the timeline toots
    static async getFeed(): Promise<Toot[] | null> {
        return await this.getToots(StorageKey.TIMELINE);
    }

    // Get the user's saved timeline filter settings
    static async getFilters(): Promise<FeedFilterSettings | null> {
        const filters = await this.get(StorageKey.FILTERS) as FeedFilterSettings;
        // Filters are saved in a serialized format that requires deserialization
        return filters ? buildFiltersFromArgs(filters) : null;
    }

    // Generic method for deserializing stored toots
    static async getToots(key: StorageKey): Promise<Toot[] | null> {
        const toots = await this.get(key) as SerializableToot[];
        return toots ? toots.map(t => new Toot(t)) : null;
    }

    // Get trending tags, toots, and links as a single TrendingStorage object
    static async getTrending(): Promise<TrendingStorage> {
        return {
            links: await this.getCoerced<TrendingLink>(StorageKey.FEDIVERSE_TRENDING_LINKS),
            tags: await this.getCoerced<TrendingTag>(StorageKey.FEDIVERSE_TRENDING_TAGS),
            toots: (await this.getToots(StorageKey.FEDIVERSE_TRENDING_TOOTS)) ?? [],
        };
    }

    // Get a collection of information about the user's followed accounts, tags, blocks, etc.
    static async getUserData(): Promise<UserData> {
        // TODO: unify blocked and muted account logic?
        const blockedAccounts = await this.getCoerced<mastodon.v1.Account>(StorageKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.getCoerced<mastodon.v1.Account>(StorageKey.MUTED_ACCOUNTS);

        return UserData.buildFromData({
            followedAccounts: await this.getAccounts(StorageKey.FOLLOWED_ACCOUNTS) || [],
            followedTags: await this.getCoerced<mastodon.v1.Tag>(StorageKey.FOLLOWED_TAGS),
            mutedAccounts: mutedAccounts.concat(blockedAccounts).map((a) => new Account(a)),
            recentToots: await this.getToots(StorageKey.RECENT_USER_TOOTS) || [],
            serverSideFilters: await this.getCoerced<mastodon.v2.Filter>(StorageKey.SERVER_SIDE_FILTERS),
        });
    }

    // Return true if the data stored at 'key' is stale and should be refetched
    // Preferred boolean is like this:
    //
    //       if (cachedData && !(await Storage.isDataStale(label))) {
    //            useCache()
    //       } else {
    //             fetchData()
    //       }
    static async isDataStale(key: StorageKey): Promise<boolean> {
        const staleDataConfig = Storage.getConfig().staleDataSeconds;
        const staleAfterSeconds = staleDataConfig[key] ?? Storage.getConfig().staleDataDefaultSeconds;
        const dataAgeInSeconds = await this.secondsSinceLastUpdated(key);
        const numAppOpens = await this.getNumAppOpens();

        const logPrefix = `${LOG_PREFIX} isDataStale("${key}"):`;
        let secondsLogMsg = `(dataAgeInSeconds: ${toLocaleInt(dataAgeInSeconds)}`;
        secondsLogMsg += `, staleAfterSeconds: ${toLocaleInt(staleAfterSeconds)}`;
        secondsLogMsg += `, numAppOpens is ${numAppOpens})`;

        if (numAppOpens <= 1) {
            // TODO: this feels like a very janky work around to the initial load issue
            console.debug(`${logPrefix} numAppOpens=${numAppOpens} means initial load, data not stale ${secondsLogMsg}`);
            return false;
        } if (dataAgeInSeconds == null) {
            console.log(`${logPrefix} no value for dataAgeInSeconds so data is stale ${secondsLogMsg}`);
            return true;
        } else if (dataAgeInSeconds > staleAfterSeconds) {
            console.log(`${logPrefix} Data is stale ${secondsLogMsg}`);
            return true;
        } else {
            traceLog(`${logPrefix} Cached data is still fresh ${secondsLogMsg}`);
            return false;
        }
    }

    static async logAppOpen(): Promise<void> {
        let numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(StorageKey.OPENINGS, numAppOpens);
    }

    // Return the user's stored timeline weightings
    static async getWeightings(): Promise<Weights> {
        const weightings = await this.get(StorageKey.WEIGHTS);
        return (weightings ?? {}) as Weights;
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
        const withTimestamp = { updatedAt, value} as StorableWithTimestamp;
        traceLog(LOG_PREFIX, `Setting value at key: ${storageKey} to value:`, withTimestamp);
        await localForage.setItem(storageKey, withTimestamp);
    }

    // Store the current timeline toots
    static async setFeed(timeline: Toot[]) {
        await this.storeToots(StorageKey.TIMELINE, timeline);
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
        await localForage.setItem(StorageKey.USER, user.serialize());
    }

    static async setWeightings(userWeightings: Weights): Promise<void> {
        await this.set(StorageKey.WEIGHTS, userWeightings);
    }

    // Generic method for serializing toots to storage
    static async storeToots(key: StorageKey, toots: Toot[]) {
        const serializedToots = toots.map(t => t.serialize());
        await this.set(key, serializedToots);
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
                console.warn(`No user identity found! MastoApi has a user ID, using that instead`);
                user = MastoApi.instance.user;
                await this.setIdentity(user);
            } else {
                logAndThrowError(`${LOG_PREFIX} No user identity found! Cannot build key for ${key}`);
            }
        }

        return `${user.id}_${key}`;
    }

    // Get the user identity from storage
    private static async getIdentity(): Promise<Account | null> {
        const user = await localForage.getItem(StorageKey.USER);
        return user ? new Account(user as mastodon.v1.Account) : null;
    }

    // Get the number of times the app has been opened by this user
    private static async getNumAppOpens(): Promise<number> {
        return (await this.get(StorageKey.OPENINGS) as number) ?? 0;
    }

    // Get the timestamp the app was last opened // TODO: currently unused
    private static async lastOpenedAt(): Promise<Date | null> {
        return await this.updatedAt(StorageKey.OPENINGS);
    }

    // Return the seconds from the updatedAt stored at 'key' and now
    private static async secondsSinceLastUpdated(key: StorageKey): Promise<number | null> {
        const updatedAt = await this.updatedAt(key);
        return updatedAt ? ageInSeconds(updatedAt) : null;
    }

    private static async updatedAt(key: StorageKey): Promise<Date | null> {
        const withTimestamp = await localForage.getItem(await this.buildKey(key));
        return withTimestamp ? new Date((withTimestamp as StorableWithTimestamp).updatedAt) : null;
    }

    // Return the number of seconds since the most recent toot in the stored timeline   // TODO: unused
    private static async secondsSinceMostRecentToot(): Promise<number | null> {
        const timelineToots = await this.getToots(StorageKey.TIMELINE);
        if (!timelineToots) return null;
        const mostRecent = mostRecentTootedAt(timelineToots);

        if (mostRecent) {
            return ageInSeconds(mostRecent.getTime());
        } else {
            debug(`No most recent toot found`);
            return null;
        }
    }
};
