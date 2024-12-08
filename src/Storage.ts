/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
import localForage from "localforage";
import { mastodon } from "masto";

import NumericFilter, { FILTERABLE_SCORES } from "./objects/numeric_filter";
import PropertyFilter, { PropertyName } from "./objects/property_filter";
import {
    Config,
    FeedFilterSettings,
    FeedFilterSettingsSerialized,
    StorageValue,
    Toot,
    WeightName,
    Weights
} from "./types";
import { DEFAULT_CONFIG, DEFAULT_FILTERS } from "./config";

export enum Key {
    CORE_SERVER = 'coreServer',
    FILTERS = 'filters',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    LAST_OPENED = "lastOpened",
    OPENINGS = "openings",
    RECENT_TOOTS = "recentToots",
    SERVER_SIDE_FILTERS = 'serverFilters',
    TIMELINE = 'timeline',
    USER = 'algouser',
    WEIGHTS = 'weights'
};


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
            filters.numericFilterArgs ??= [];
            filters.filterSections = (filters.feedFilterSectionArgs || []).reduce(
                (acc, args) => {
                    acc[args.title] = new PropertyFilter(args);
                    return acc;
                },
                {} as Record<string, PropertyFilter>
            );

            filters.numericFilters = (filters.numericFilterArgs || []).reduce(
                (acc, args) => {
                    acc[args.title as WeightName] = new NumericFilter(args);
                    return acc;
                },
                {} as Record<WeightName, NumericFilter>
            );

            FILTERABLE_SCORES.forEach(weightName => {
                filters.numericFilters[weightName] ??= new NumericFilter({title: weightName});
            });
        } else {
            console.debug(`getFilters() building DEFAULT_FILTERS:`, filters);
            filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS)) as FeedFilterSettings;

            // Start with the numeric filters and the source filter section
            FILTERABLE_SCORES.forEach(weightName => {
                filters.numericFilters[weightName] = new NumericFilter({title: weightName});
            });

            filters.filterSections[PropertyName.SOURCE] = new PropertyFilter({title: PropertyName.SOURCE});
            await this.setFilters(DEFAULT_FILTERS);
        }

        console.log(`[Storage] getFilters() returning:`, filters);
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
        console.debug(`Setting identity to:`, user);
        await localForage.setItem(Key.USER, user);
    }

    static async getFeed(): Promise<Toot[]> {
        let toots = await this.get(Key.TIMELINE);
        return (toots ?? []) as Toot[];
    }

    static async setFeed(timeline: Toot[]) {
        await this.set(Key.TIMELINE, timeline);
    }

    // Get the value at the given key (with the user ID as a prefix)
    protected static async get(key: Key | WeightName): Promise<StorageValue | null> {
        return await localForage.getItem(await this.buildKey(key));
    }

    // Set the value at the given key (with the user ID as a prefix)
    protected static async set(key: Key | WeightName, value: StorageValue): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, value);
        await localForage.setItem(storageKey, value);
    }

    protected static async remove(key: Key | WeightName): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Removing value at key: ${storageKey}`);
        await localForage.removeItem(storageKey);
    }

    private static async buildKey(key: Key | WeightName): Promise<string> {
        const user = await this.getIdentity();

        if (user) {
            return `${user.id}_${key}`;
        } else {
            throw new Error("No user identity found");
        }
    }
};
