/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { mastodon } from "masto";

import NumericFilter from "./filters/numeric_filter";
import PropertyFilter from "./filters/property_filter";
import Toot from './api/objects/toot';
import { FILTERABLE_SCORES } from "./filters/numeric_filter";
import { DEFAULT_CONFIG, DEFAULT_FILTERS, buildNewFilterSettings } from "./config";
import { PropertyName } from "./filters/property_filter";
import {
    Config,
    FeedFilterSettings,
    FeedFilterSettingsSerialized,
    Key,
    StorageKey,
    StorageValue,
    TootExtension,
    WeightName,
    Weights
} from "./types";


export default class Storage {
    static config: Config = Object.assign({}, DEFAULT_CONFIG);

    // TODO: consider actually storing the config in browser storage.
    static getConfig(): Config {
        return this.config;
    }

    static async getWeightings(): Promise<Weights> {
        const weightings = await this.get(Key.WEIGHTS);
        return (weightings ?? {}) as Weights;
    }

    static async setWeightings(userWeightings: Weights): Promise<void> {
        await this.set(Key.WEIGHTS, userWeightings);
    }

    static async getFilters(): Promise<FeedFilterSettings> {
        let filters = await this.get(Key.FILTERS) as FeedFilterSettings; // Returns serialized FeedFilterSettings

        if (filters) {
            populateFiltersFromArgs(filters);
        } else {
            filters = buildNewFilterSettings();
            await this.setFilters(DEFAULT_FILTERS);  // DEFAULT_FILTERS not the filters we just built
        }

        console.debug(`[Storage] getFilters() returning:`, filters);
        return filters;
    }

    // Serialize the FeedFilterSettings object
    static async setFilters(filters: FeedFilterSettings): Promise<void> {
        const filterSettings = {
            feedFilterSectionArgs: Object.values(filters.filterSections).map(section => section.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        } as FeedFilterSettingsSerialized;

        await this.set(Key.FILTERS, filterSettings);
    }

    // TODO: this name is too close to the overridden method in MastodonApiCache
    static async getFollowedAccts(): Promise<mastodon.v1.Account[]> {
        const followedAccounts = await this.get(Key.FOLLOWED_ACCOUNTS);
        return (followedAccounts ?? []) as mastodon.v1.Account[];
    }

    static async logAppOpen(): Promise<void> {
        let numAppOpens = (await this.get(Key.OPENINGS) as number || 0) + 1;
        await this.set(Key.OPENINGS, numAppOpens);
        await this.set(Key.LAST_OPENED, new Date().getTime());
    }

    static async getLastOpenedTimestamp(): Promise<number> {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(Key.LAST_OPENED) as number;

        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`Only ${numAppOpens} app opens; returning 0 for getLastOpenedTimestamp() instead of ${lastOpenedInt}`);
            return 0;
        }

        console.log(`lastOpenedTimestamp (${numAppOpens} appOpens): ${lastOpenedInt} (${new Date(lastOpenedInt)})`);
        return lastOpenedInt;
    }

    static async getNumAppOpens(): Promise<number> {
        let numAppOpens = await this.get(Key.OPENINGS) as number || 0;
        console.debug(`getNumAppOpens() returning ${numAppOpens}`);
        return numAppOpens;
    }

    static async getIdentity(): Promise<mastodon.v1.Account | null> {
        return await localForage.getItem(Key.USER);
    }

    static async setIdentity(user: mastodon.v1.Account) {
        console.debug(`Setting identity to:`, user);  // TODO: this is insecure logging
        await localForage.setItem(Key.USER, user);
    }

    static async getFeed(): Promise<Toot[]> {
        let cachedToots = await this.get(Key.TIMELINE);
        let toots = (cachedToots ?? []) as TootExtension[];  // Status doesn't include all our Toot props but it should be OK?
        return toots.map(t => new Toot(t));
    }

    static async setFeed(timeline: Toot[]) {
        const toots = timeline.map(t => ({...t})) as TootExtension[];  // Remove functions so it can be serialized
        await this.set(Key.TIMELINE, toots);
    }

    // Get the value at the given key (with the user ID as a prefix)
    static async get(key: StorageKey): Promise<StorageValue | null> {
        return await localForage.getItem(await this.buildKey(key));
    }

    // Set the value at the given key (with the user ID as a prefix)
    static async set(key: StorageKey, value: StorageValue): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, value);
        await localForage.setItem(storageKey, value);
    }

    static async remove(key: StorageKey): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Removing value at key: ${storageKey}`);
        await localForage.removeItem(storageKey);
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


// For building a FeedFilterSettings object from the serialized version. Mutates object.
function populateFiltersFromArgs(serializedFilterSettings: FeedFilterSettings): void {
    serializedFilterSettings.filterSections ??= {} as Record<PropertyName, PropertyFilter>;
    serializedFilterSettings.numericFilters ??= {} as Record<WeightName, NumericFilter>;

    serializedFilterSettings.feedFilterSectionArgs.forEach((args) => {
        serializedFilterSettings.filterSections[args.title as PropertyName] = new PropertyFilter(args);
    });

    serializedFilterSettings.numericFilterArgs.forEach((args) => {
        serializedFilterSettings.numericFilters[args.title as WeightName] = new NumericFilter(args);
    });

    // Fill in any missing values
    FILTERABLE_SCORES.forEach(weightName => {
        serializedFilterSettings.numericFilters[weightName] ??= new NumericFilter({title: weightName});
    });
};
