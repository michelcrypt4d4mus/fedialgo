import localForage from "localforage";
import { mastodon } from "masto";

import { Config, FeedFilterSettings, StorageValue, StringNumberDict, Toot } from "./types";
import { DEFAULT_CONFIG } from "./config";

export enum Key {
    CORE_SERVER = 'coreServer',
    FILTERS = 'filters',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    FOLLOWED_TAGS = 'FollowedTags',
    LAST_OPENED = "lastOpened",
    OPENINGS = "openings",
    RECENT_TOOTS = "recentToots",
    REPLIED_TO = "MostRepliedAccounts",
    TIMELINE = 'timeline',
    TOP_FAVS = 'Favs',
    TOP_INTERACTS = 'Interactions',
    TOP_REBLOGS = 'MostRetootedAccounts',
    USER = 'algouser',
    WEIGHTS = 'weights',
};

export const DEFAULT_FILTERS = {
    filteredApps: [],
    filteredLanguages: [],
    filteredTags: [],
    includeFollowedAccounts: true,
    includeFollowedHashtags: true,
    includeReplies: true,
    includeReposts: true,
    includeTrendingHashTags: true,
    includeTrendingToots: true,
    onlyLinks: false,
    suppressSelectedTags: false,
    weightLearningEnabled: false,
} as FeedFilterSettings;


export default class Storage {
    static config: Config = Object.assign({}, DEFAULT_CONFIG);

    // TODO: consider actually storing the config in browser storage.
    static getConfig(): Config {
        return this.config;
    }

    static async getWeightings(): Promise<StringNumberDict> {
        const weightings = await this.get(Key.WEIGHTS);
        return (weightings ?? {}) as StringNumberDict;
    }

    static async setWeightings(userWeightings: StringNumberDict): Promise<void> {
        await this.set(Key.WEIGHTS, userWeightings);
    }

    static async getFilters(): Promise<FeedFilterSettings> {
        let filters = await this.get(Key.FILTERS);

        if (!filters) {
            console.debug(`getFilters() returning DEFAULT_FILTERS:`, filters);
            filters = Object.assign({}, DEFAULT_FILTERS);
            await this.setFilters(filters);
        }

        return filters as FeedFilterSettings;
    }

    static async setFilters(filters: FeedFilterSettings): Promise<void> {
        await this.set(Key.FILTERS, filters);
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
    protected static async get(key: Key): Promise<StorageValue | null> {
        return await localForage.getItem(await this.buildKey(key));
    }

    // Set the value at the given key (with the user ID as a prefix)
    protected static async set(key: Key, value: StorageValue): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, value);
        await localForage.setItem(storageKey, value);
    }

    protected static async remove(key: Key): Promise<void> {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Removing value at key: ${storageKey}`);
        await localForage.removeItem(storageKey);
    }

    private static async buildKey(key: Key): Promise<string> {
        const user = await this.getIdentity();

        if (user) {
            return `${user.id}_${key}`;
        } else {
            throw new Error("No user identity found");
        }
    }
};
