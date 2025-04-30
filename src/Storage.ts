/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { mastodon } from "masto";

import Account from "./api/objects/account";
import Toot, { mostRecentTootedAt, SerializableToot } from './api/objects/toot';
import { ageInSeconds, ageOfTimestampInSeconds } from "./helpers/time_helpers";
import { buildFiltersFromArgs, buildNewFilterSettings, DEFAULT_FILTERS } from "./filters/feed_filters";
import { Config, DEFAULT_CONFIG } from "./config";
import { countValues } from "./helpers/collection_helpers";
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

    // TODO: This might not be the right place for this. Also should it be cached in the browser storage?
    static getConfig(): Config {
        return this.config;
    }

    // Return the user's stored timeline weightings
    static async getWeightings(): Promise<Weights> {
        const weightings = await this.get(StorageKey.WEIGHTS);
        return (weightings ?? {}) as Weights;
    }

    static async setWeightings(userWeightings: Weights): Promise<void> {
        await this.set(StorageKey.WEIGHTS, userWeightings);
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

    // Serialize the FeedFilterSettings object
    static async setFilters(filters: FeedFilterSettings): Promise<void> {
        const filterSettings = {
            feedFilterSectionArgs: Object.values(filters.filterSections).map(section => section.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        } as FeedFilterSettingsSerialized;

        await this.set(StorageKey.FILTERS, filterSettings);
    }

    // Get a collection of information about the user's followed accounts, tags, blocks, etc.
    static async getUserData(): Promise<UserData> {
        const followedAccounts = await this.get(StorageKey.FOLLOWED_ACCOUNTS) as mastodon.v1.Account[];
        const followedTags = await this.get(StorageKey.FOLLOWED_TAGS) as mastodon.v1.Tag[];
        const serverSideFilters = await this.get(StorageKey.SERVER_SIDE_FILTERS) as mastodon.v2.Filter[];

        const blockedAccounts = await this.get(StorageKey.BLOCKED_ACCOUNTS) as mastodon.v1.Account[];
        const mutedAccounts = await this.get(StorageKey.MUTED_ACCOUNTS) as mastodon.v1.Account[];
        const allMutedAccounts = (mutedAccounts ?? []).concat(blockedAccounts ?? []).map((a) => new Account(a));

        return {
            followedAccounts: Account.buildAccountNames((followedAccounts ?? []).map(a => new Account(a))),
            followedTags: countValues<mastodon.v1.Tag>(followedTags ?? [], tag => tag.name),
            mutedAccounts: Account.buildAccountNames(allMutedAccounts),
            serverSideFilters: serverSideFilters ?? {},
        };
    }

    static async logAppOpen(): Promise<void> {
        let numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(StorageKey.OPENINGS, numAppOpens);
        await this.set(StorageKey.LAST_OPENED, new Date().getTime());
    }

    // Get the user identity from storage
    static async getIdentity(): Promise<Account | null> {
        const user = await localForage.getItem(StorageKey.USER);
        return user ? new Account(user as mastodon.v1.Account) : null;
    }

    // TODO: the storage key is not prepended with the user ID (maybe that's OK?)
    static async setIdentity(user: Account) {
        console.debug(`Setting fedialgo user identity to:`, user);
        await localForage.setItem(StorageKey.USER, user.serialize());
    }

    // Get the timeline toots
    static async getFeed(): Promise<Toot[]> {
        return await this.getToots(StorageKey.TIMELINE);
    }

    // Store the current timeline toots
    static async setFeed(timeline: Toot[]) {
        await this.storeToots(StorageKey.TIMELINE, timeline);
    }

    // Generic method for deserializing stored toots
    static async getToots(key: StorageKey): Promise<Toot[]> {
        const toots = await this.get(key) as SerializableToot[];
        return (toots ?? []).map(t => new Toot(t));
    }

    // Generic method for serializing toots to storage
    static async storeToots(key: StorageKey, toots: Toot[]) {
        const serializedToots = toots.map(t => t.serialize());
        await this.set(key, serializedToots);
    }

    // Get trending tags, toots, and links as a single TrendingStorage object
    static async getTrending(): Promise<TrendingStorage> {
        return {
            links: ((await this.get(StorageKey.FEDIVERSE_TRENDING_LINKS)) ?? []) as TrendingLink[],
            tags: ((await this.get(StorageKey.FEDIVERSE_TRENDING_TAGS)) ?? []) as TrendingTag[],
            toots: await this.getToots(StorageKey.FEDIVERSE_TRENDING_TOOTS),
        };
    }

    // Return true if the timeline and user data is stale and should be reloaded
    static async isDataStale(key: StorageKey): Promise<boolean> {
        const staleDataConfig = Storage.getConfig().staleDataSeconds;
        const staleAfterSeconds = staleDataConfig[key] ?? Storage.getConfig().staleDataDefaultSeconds;
        const dataAgeInSeconds = await this.secondsSinceLastUpdated(key);
        const numAppOpens = await this.getNumAppOpens();

        const logPrefix = `[isDataStale ${key}]`;
        let secondsLogMsg = `(dataAgeInSeconds: ${dataAgeInSeconds?.toFixed(0)}`;
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
            console.debug(`${logPrefix} Remote data is still fresh no need to reload ${secondsLogMsg}`);
            return false;
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

    // Set the value at the given key (with the user ID as a prefix)
    static async set(key: StorageKey, value: StorableObj): Promise<void> {
        const storageKey = await this.buildKey(key);
        const updatedAt = new Date().toISOString();
        const withTimestamp = { updatedAt, value} as StorableWithTimestamp;
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, withTimestamp);
        await localForage.setItem(storageKey, withTimestamp);
    }

    static async remove(key: StorageKey): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.log(`[STORAGE] Removing value at key: ${storageKey}`);
        await localForage.removeItem(storageKey);
    }

    private static async getLastOpenedTimestamp(): Promise<number | undefined> {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(StorageKey.LAST_OPENED) as number;

        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`Only ${numAppOpens} app opens; returning 0 for getLastOpenedTimestamp() instead of ${lastOpenedInt}`);
            return;
        }

        console.log(`lastOpenedTimestamp (${numAppOpens} appOpens): ${lastOpenedInt} (${new Date(lastOpenedInt)})`);
        return lastOpenedInt;
    }

    private static async getNumAppOpens(): Promise<number> {
        const numAppOpens = await this.get(StorageKey.OPENINGS) as number;
        return numAppOpens || 0;
    }

    // Seconds since the app was last opened  // TODO: currently unused
    private static async secondsSinceLastOpened(): Promise<number | undefined> {
        const lastOpened = await this.getLastOpenedTimestamp();
        return lastOpened ? ageOfTimestampInSeconds(lastOpened) : undefined;
    }

    // Return the seconds from the updatedAt stored at 'key' and now
    private static async secondsSinceLastUpdated(key: StorageKey): Promise<number | null> {
        const withTimestamp = await localForage.getItem(await this.buildKey(key));

        if (withTimestamp) {
            return ageInSeconds((withTimestamp as StorableWithTimestamp).updatedAt);
        } else {
            console.debug(`[${key}] secondsSinceLastUpdated(): No stored object found at key '${key}'`);
            return null;
        }
    }

    // Return the number of seconds since the most recent toot in the stored timeline
    private static async secondsSinceMostRecentToot(): Promise<number | null> {
        const timelineToots = await this.getToots(StorageKey.TIMELINE);
        const mostRecent = mostRecentTootedAt(timelineToots);

        if (mostRecent) {
            return ageOfTimestampInSeconds(mostRecent.getTime());
        } else {
            console.debug(`No most recent toot found`);
            return null;
        }
    }

    private static async buildKey(key: StorageKey): Promise<string> {
        const user = await this.getIdentity();

        if (user) {
            return `${user.id}_${key}`;
        } else {
            throw new Error("No user identity found");
        }
    }
};
