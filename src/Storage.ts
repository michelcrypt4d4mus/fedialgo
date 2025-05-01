/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { mastodon } from "masto";

import Account from "./api/objects/account";
import Toot, { mostRecentTootedAt, SerializableToot } from './api/objects/toot';
import { ageInSeconds, quotedISOFmt } from "./helpers/time_helpers";
import { buildFiltersFromArgs, buildNewFilterSettings, DEFAULT_FILTERS } from "./filters/feed_filters";
import { Config, DEFAULT_CONFIG } from "./config";
import { countValues, keyByProperty } from "./helpers/collection_helpers";
import { logAndThrowError } from "./helpers/string_helpers";
import {
    FeedFilterSettings,
    FeedFilterSettingsSerialized,
    StorableObj,
    StorableWithTimestamp,
    StorageKey,
    TrendingLink,
    TrendingStorage,
    TrendingTag,
    UserData,
    Weights,
} from "./types";


export default class Storage {
    static config: Config = Object.assign({}, DEFAULT_CONFIG);

    // Clear everything but preserve the user's identity and weightings
    static async clearAll(): Promise<void> {
        console.log(`[STORAGE] Clearing all storage`);
        const user = await this.getIdentity();
        const weights = await this.getWeightings();
        await localForage.clear();

        if (user) {
            console.log(`[STORAGE] Cleared storage for user ${user.webfingerURI}, keeping weights:`, weights);
            await this.setIdentity(user);
            if (weights) await this.setWeightings(weights);
        } else {
            console.warn(`[STORAGE] No user identity found, cleared storage anyways`);
        }
    }

    // Get the value at the given key (with the user ID as a prefix)
    static async get(key: StorageKey): Promise<StorableObj | null> {
        const withTimestamp = await localForage.getItem(await this.buildKey(key)) as StorableWithTimestamp;

        if (!withTimestamp) {
            return null;
        } else if (!withTimestamp.updatedAt) {
            // Code to handle upgrades of existing users who won't have the updatedAt / value format in browser storage
            console.warn(`[STORAGE] No updatedAt timestamp found for ${key}, likely due to a fedialgo upgrade. Clearing cache.`);
            await this.remove(key);
            return null;
        }

        return withTimestamp.value;
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
            logAndThrowError(`[Storage] Expected array at '${key}' but got`, value);
        }

        return value as T[];
    }

    // Get the timeline toots
    static async getFeed(): Promise<Toot[] | null> {
        return await this.getToots(StorageKey.TIMELINE);
    }

    // Get the user's saved timeline filter settings
    static async getFilters(): Promise<FeedFilterSettings> {
        let filters = await this.get(StorageKey.FILTERS) as FeedFilterSettings; // Returns serialized FeedFilterSettings

        if (filters) {
            buildFiltersFromArgs(filters);
        } else {
            filters = buildNewFilterSettings();
            await this.setFilters(DEFAULT_FILTERS);  // DEFAULT_FILTERS not the filters we just built
        }

        return filters;
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
        const followedAccounts = await this.getCoerced<mastodon.v1.Account>(StorageKey.FOLLOWED_ACCOUNTS);
        const followedTags = await this.getCoerced<mastodon.v1.Tag>(StorageKey.FOLLOWED_TAGS);
        const serverSideFilters = await this.getCoerced<mastodon.v2.Filter>(StorageKey.SERVER_SIDE_FILTERS);
        // TODO: unify blocked and muted account logic?
        const blockedAccounts = await this.getCoerced<mastodon.v1.Account>(StorageKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.getCoerced<mastodon.v1.Account>(StorageKey.MUTED_ACCOUNTS);
        const silencedAccounts = mutedAccounts.concat(blockedAccounts).map((a) => new Account(a));

        return {
            followedAccounts: Account.buildAccountNames(followedAccounts.map(a => new Account(a))),
            followedTags: keyByProperty<mastodon.v1.Tag>(followedTags, (tag) => tag.name),
            mutedAccounts: Account.buildAccountNames(silencedAccounts),
            serverSideFilters: serverSideFilters,
        };
    }

    // Return true if the data stored at 'key' is stale and should be refetched
    static async isDataStale(key: StorageKey): Promise<boolean> {
        const staleDataConfig = Storage.getConfig().staleDataSeconds;
        const staleAfterSeconds = staleDataConfig[key] ?? Storage.getConfig().staleDataDefaultSeconds;
        const dataAgeInSeconds = await this.secondsSinceLastUpdated(key);
        const numAppOpens = await this.getNumAppOpens();

        const logPrefix = `[isDataStale ${key}]`;
        let secondsLogMsg = `(dataAgeInSeconds: ${dataAgeInSeconds?.toFixed(0).toLocaleString()}`;
        secondsLogMsg += `, staleAfterSeconds: ${staleAfterSeconds.toLocaleString()}`;
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
            console.debug(`${logPrefix} Cached data is still fresh, no need to refetch ${secondsLogMsg}`);
            return false;
        }
    }

    static async logAppOpen(): Promise<void> {
        let numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(StorageKey.OPENINGS, numAppOpens);
        await this.set(StorageKey.LAST_OPENED, new Date().getTime());
    }

    // Return the user's stored timeline weightings
    static async getWeightings(): Promise<Weights> {
        const weightings = await this.get(StorageKey.WEIGHTS);
        return (weightings ?? {}) as Weights;
    }

    // Delete the value at the given key (with the user ID as a prefix)
    static async remove(key: StorageKey): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.log(`[STORAGE] Removing value at key: ${storageKey}`);
        await localForage.removeItem(storageKey);
    }

    // Set the value at the given key (with the user ID as a prefix)
    static async set(key: StorageKey, value: StorableObj): Promise<void> {
        const storageKey = await this.buildKey(key);
        const updatedAt = new Date().toISOString();
        const withTimestamp = { updatedAt, value} as StorableWithTimestamp;
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, withTimestamp);
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
        console.debug(`Setting fedialgo user identity to:`, user);
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
        const user = await this.getIdentity();
        if (!user) logAndThrowError(`[Storage] No user identity found`);
        return `${user.id}_${key}`;
    }

    // Get the user identity from storage
    private static async getIdentity(): Promise<Account | null> {
        const user = await localForage.getItem(StorageKey.USER);
        return user ? new Account(user as mastodon.v1.Account) : null;
    }

    // Get the timestamp the app was last opened // TODO: currently unused
    private static async getLastOpenedTimestamp(): Promise<number | undefined> {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(StorageKey.LAST_OPENED) as number;
        const logPrefix = `[getLastOpenedTimestamp()]`;

        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`${logPrefix} Only ${numAppOpens} app opens; returning 0 instead of ${lastOpenedInt}`);
            return;
        }

        console.log(`${logPrefix} last opened ${quotedISOFmt(new Date(lastOpenedInt))} (${numAppOpens} appOpens)`);
        return lastOpenedInt;
    }

    // Get the number of times the app has been opened by this user
    private static async getNumAppOpens(): Promise<number> {
        return (await this.get(StorageKey.OPENINGS) as number) ?? 0;
    }

    // Return the seconds from the updatedAt stored at 'key' and now
    private static async secondsSinceLastUpdated(key: StorageKey): Promise<number | null> {
        const withTimestamp = await localForage.getItem(await this.buildKey(key));

        if (withTimestamp) {
            return ageInSeconds((withTimestamp as StorableWithTimestamp).updatedAt);
        } else {
            console.debug(`[${key}] secondsSinceLastUpdated(): No stored object found at '${key}'`);
            return null;
        }
    }

    // Return the number of seconds since the most recent toot in the stored timeline   // TODO: unused
    private static async secondsSinceMostRecentToot(): Promise<number | null> {
        const timelineToots = await this.getToots(StorageKey.TIMELINE);
        if (!timelineToots) return null;
        const mostRecent = mostRecentTootedAt(timelineToots);

        if (mostRecent) {
            return ageInSeconds(mostRecent.getTime());
        } else {
            console.debug(`No most recent toot found`);
            return null;
        }
    }
};
