/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { mastodon } from "masto";

import Account from "./api/objects/account";
import Toot, { mostRecentTootedAt, SerializableToot } from './api/objects/toot';
import { ageOfTimestampInSeconds } from "./helpers/time_helpers";
import { buildFiltersFromArgs, buildNewFilterSettings, DEFAULT_FILTERS } from "./filters/feed_filters";
import { countValues } from "./helpers/collection_helpers";
import { DEFAULT_CONFIG } from "./config";
import {
    Config,
    FeedFilterSettings,
    FeedFilterSettingsSerialized,
    StorableObj,
    StorageKey,
    TrendingLink,
    TrendingStorage,
    TrendingStorageSerialized,
    TrendingTag,
    UserData,
    Weights,
} from "./types";


export default class Storage {
    static config: Config = Object.assign({}, DEFAULT_CONFIG);

    // TODO: consider actually storing the config in browser storage.
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

    // Generic method for serializing toots to storage
    static async storeToots(key: StorageKey, toots: Toot[]) {
        const serializedToots = toots.map(t => t.serialize());
        await this.set(key, serializedToots);
    }

    // Get the timeline toots
    static async getFeed(): Promise<Toot[]> {
        return await this.getToots(StorageKey.TIMELINE);
    }

    // Store the current timeline toots
    static async setFeed(timeline: Toot[]) {
        await this.storeToots(StorageKey.TIMELINE, timeline);
    }

    // Get trending tags, toots, and links
    static async getTrending(): Promise<TrendingStorage> {
        return {
            links: ((await this.get(StorageKey.FEDIVERSE_TRENDING_LINKS)) ?? []) as TrendingLink[],
            tags: ((await this.get(StorageKey.FEDIVERSE_TRENDING_TAGS)) ?? []) as TrendingTag[],
            toots: await this.getToots(StorageKey.FEDIVERSE_TRENDING_TOOTS),
        };
    }

    // Return true if the timeline and user data is stale and should be reloaded
    static async isDataStale(): Promise<boolean> {
        const seconds = await this.secondsSinceMostRecentToot();
        const numAppOpens = await this.getNumAppOpens();
        // const isTenthAppOpen = (await this.getNumAppOpens()) % this.getConfig().reloadFeaturesEveryNthOpen === 0;

        if (numAppOpens <= 1) {
            console.debug(`[isDataStale] numAppOpens is ${JSON.stringify(numAppOpens)} (initial load; data not stale)`);
            return false;
        } if (!seconds) {
            console.debug(`[isDataStale] secondsSinceMostRecentToot() returned ${JSON.stringify(seconds)} (data is stale)`);
            return true;
        } else if (seconds > this.getConfig().staleDataSeconds) {
            console.debug(`[isDataStale] Reloading data after ${seconds} seconds...`);
            return true;
        } else {
            console.debug(`[isDataStale] Remote data is still fresh (${seconds} seconds old), no need to reload.`);
            return false;
        }
    }

    // Seconds since the app was last opened  // TODO: currently unused
    static async secondsSinceLastOpened(): Promise<number | undefined> {
        const lastOpened = await this.getLastOpenedTimestamp();
        return lastOpened ? ageOfTimestampInSeconds(lastOpened) : undefined;
    }

    // Get the value at the given key (with the user ID as a prefix)
    static async get(key: StorageKey): Promise<StorableObj | null> {
        return await localForage.getItem(await this.buildKey(key));
    }

    // Set the value at the given key (with the user ID as a prefix)
    static async set(key: StorageKey, value: StorableObj): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, value);
        await localForage.setItem(storageKey, value);
    }

    static async remove(key: StorageKey): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Removing value at key: ${storageKey}`);
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

    // Generic method for deserializing stored toots
    private static async getToots(key: StorageKey): Promise<Toot[]> {
        let toots = await this.get(key) as SerializableToot[];
        return (toots ?? []).map(t => new Toot(t));
    }

    // Return the number of seconds since the most recent toot in the stored timeline
    private static async secondsSinceMostRecentToot(): Promise<number | null | undefined> {
        const timelineToots = await this.getToots(StorageKey.TIMELINE);
        const mostRecent = mostRecentTootedAt(timelineToots);

        if (mostRecent) {
            return ageOfTimestampInSeconds(mostRecent.getTime());
        } else {
            console.debug(`No most recent toot found`);
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
