import localForage from "localforage";
import { mastodon } from "masto";

import { FeedFilterSettings, ScoresType, StorageValue, Toot } from "./types";

export enum Key {
    CORE_SERVER = 'coreServer',
    FILTERS = 'filters',
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
    filteredLanguages: [],
    includeFollowedHashtags: true,
    includeFollowedAccounts: true,
    includeReposts: true,
    includeReplies: true,
    includeTrendingToots: true,
    onlyLinks: false,
    weightLearningEnabled: false,
} as FeedFilterSettings;


export default class Storage {
    static async getWeightings(): Promise<ScoresType> {
        let weightings = await this.get(Key.WEIGHTS);
        weightings ??= {};
        return weightings as ScoresType;
    }

    static async setWeightings(userWeightings: ScoresType): Promise<void> {
        await this.set(Key.WEIGHTS, userWeightings);
    }

    static async getFilters(): Promise<FeedFilterSettings> {
        let filters = await this.get(Key.FILTERS);
        filters ??= DEFAULT_FILTERS;
        return filters as FeedFilterSettings;
    }

    static async setFilters(filters: FeedFilterSettings): Promise<void> {
        await this.set(Key.FILTERS, filters);
    }

    static async logAppOpen(): Promise<void> {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS) as string);

        if (numAppOpens == null || isNaN(numAppOpens)) {
            await this.set(Key.OPENINGS, "1", true);
        } else {
            await this.set(Key.OPENINGS, (numAppOpens + 1).toString(), true);
        }

        await this.set(Key.LAST_OPENED, new Date().getTime().toString(), true);
    }

    static async getLastOpenedTimestamp(): Promise<number> {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = parseInt(await this.get(Key.LAST_OPENED) as string);
        console.log(`lastOpenedTimestamp (after ${numAppOpens} app opens) milliseconds: ${lastOpenedInt}`);

        if (numAppOpens <= 1) {
            console.log(`Only 1 numAppOpens so returning 0 for getLastOpenedTimestamp()`);
            return 0;
        }

        if (lastOpenedInt) {
            console.log(`lastOpenedTimestamp: ${new Date(lastOpenedInt)}`);
        } else {
            console.log("lastOpenedTimestamp not found");
        }

        return lastOpenedInt;
    }

    static async getNumAppOpens(): Promise<number> {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS) as string);
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
        toots ??= [];
        return toots as Toot[];
    }

    static async setFeed(timeline: Toot[]) {
        await this.set(Key.TIMELINE, timeline);
    }

    // TODO: currently groupedByUser is always true ?
    protected static async get(key: Key, groupedByUser: boolean = true, suffix: string = ""): Promise<StorageValue | null> {
        const storageKey = await this.buildKey(key, groupedByUser, suffix);
        // console.debug(`[STORAGE] Retrieving value at key: ${storageKey}`);
        return await localForage.getItem(storageKey);
    }

    protected static async set(key: Key, value: StorageValue, groupedByUser = true, suffix = "") {
        const storageKey = await this.buildKey(key, groupedByUser, suffix);
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, value);
        await localForage.setItem(storageKey, value);
    }

    protected static async remove(key: Key, groupedByUser: boolean = true, suffix: string = "") {
        const storageKey = await this.buildKey(key, groupedByUser, suffix);
        console.debug(`[STORAGE] Removing value at key: ${storageKey}`);
        await localForage.removeItem(storageKey);
    }

    private static async buildKey(key: Key, groupedByUser: boolean = true, suffix: string = "") {
        const keyWithSuffix = (suffix === "") ? key : `${key}_${suffix}`;
        return groupedByUser ? await this.userPrefix(keyWithSuffix) : keyWithSuffix
    }

    private static async userPrefix(key: string) {
        const user = await this.getIdentity();

        if (user) {
            return `${user.id}_${key}`;
        } else {
            throw new Error("No user identity found");
        }
    }
};
