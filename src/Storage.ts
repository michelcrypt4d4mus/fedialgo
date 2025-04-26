/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { mastodon } from "masto";

import Account from "./api/objects/account";
import NumericFilter from "./filters/numeric_filter";
import PropertyFilter from "./filters/property_filter";
import Toot, { SerializableToot } from './api/objects/toot';
import { FILTERABLE_SCORES } from "./filters/numeric_filter";
import { DEFAULT_CONFIG, DEFAULT_FILTERS, buildNewFilterSettings } from "./config";
import { PropertyName } from "./filters/property_filter";
import {
    Config,
    FeedFilterSettings,
    FeedFilterSettingsSerialized,
    StorageKey,
    StorableObj,
    TrendingLink,
    TrendingStorage,
    TrendingTag,
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
        const weightings = await this.get(StorageKey.WEIGHTS);
        return (weightings ?? {}) as Weights;
    }

    static async setWeightings(userWeightings: Weights): Promise<void> {
        await this.set(StorageKey.WEIGHTS, userWeightings);
    }

    static async getFilters(): Promise<FeedFilterSettings> {
        let filters = await this.get(StorageKey.FILTERS) as FeedFilterSettings; // Returns serialized FeedFilterSettings

        if (filters) {
            populateFiltersFromArgs(filters);
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

    // TODO: this name is too close to the overridden method in MastodonApiCache
    static async getFollowedAccts(): Promise<Account[]> {
        let followedAccounts = await this.get(StorageKey.FOLLOWED_ACCOUNTS);
        followedAccounts = (followedAccounts ?? []) as mastodon.v1.Account[];
        return followedAccounts.map((a) => new Account(a));
    }

    static async logAppOpen(): Promise<void> {
        let numAppOpens = (await this.get(StorageKey.OPENINGS) as number || 0) + 1;
        await this.set(StorageKey.OPENINGS, numAppOpens);
        await this.set(StorageKey.LAST_OPENED, new Date().getTime());
    }

    static async getLastOpenedTimestamp(): Promise<number> {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(StorageKey.LAST_OPENED) as number;

        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`Only ${numAppOpens} app opens; returning 0 for getLastOpenedTimestamp() instead of ${lastOpenedInt}`);
            return 0;
        }

        console.log(`lastOpenedTimestamp (${numAppOpens} appOpens): ${lastOpenedInt} (${new Date(lastOpenedInt)})`);
        return lastOpenedInt;
    }

    static async getNumAppOpens(): Promise<number> {
        let numAppOpens = await this.get(StorageKey.OPENINGS) as number || 0;
        console.debug(`getNumAppOpens() returning ${numAppOpens}`);
        return numAppOpens;
    }

    static async getIdentity(): Promise<Account | null> {
        const user = await localForage.getItem(StorageKey.USER);
        return user ? new Account(user as mastodon.v1.Account) : null;
    }

    // TODO: the storage key is not prepended with the user ID (maybe that's OK?)
    static async setIdentity(user: Account) {
        console.debug(`Setting fedialgo user identity to:`, user);
        await localForage.setItem(StorageKey.USER, user.serialize());
    }

    static async getFeed(): Promise<Toot[]> {
        let cachedToots = await this.get(StorageKey.TIMELINE);
        let toots = (cachedToots ?? []) as SerializableToot[];  // Status doesn't include all our Toot props but it should be OK?
        return toots.map(t => new Toot(t));
    }

    static async setFeed(timeline: Toot[]) {
        await this.set(StorageKey.TIMELINE, timeline.map(t => t.serialize()));
    }

    static async setTrending(links: TrendingLink[], tags: TrendingTag[], _toots: Toot[]) {
        const toots = _toots.map(t => t.serialize());
        await this.set(StorageKey.TRENDING, {links, tags, toots} as TrendingStorage);
    }

    static async getTrending(): Promise<TrendingStorage> {
        const trendingData = await this.get(StorageKey.TRENDING) as TrendingStorage;

        return {
            links: (trendingData?.links ?? []) as TrendingLink[],
            tags: (trendingData?.tags ?? []) as TrendingTag[],
            toots: (trendingData?.toots ?? []).map((t) => new Toot(t)),
        };
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
