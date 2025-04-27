"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
const localforage_1 = __importDefault(require("localforage"));
const account_1 = __importDefault(require("./api/objects/account"));
const toot_1 = __importDefault(require("./api/objects/toot"));
const feed_filters_1 = require("./filters/feed_filters");
const collection_helpers_1 = require("./helpers/collection_helpers");
const config_1 = require("./config");
const types_1 = require("./types");
class Storage {
    static config = Object.assign({}, config_1.DEFAULT_CONFIG);
    // TODO: consider actually storing the config in browser storage.
    static getConfig() {
        return this.config;
    }
    static async getWeightings() {
        const weightings = await this.get(types_1.StorageKey.WEIGHTS);
        return (weightings ?? {});
    }
    static async setWeightings(userWeightings) {
        await this.set(types_1.StorageKey.WEIGHTS, userWeightings);
    }
    static async getFilters() {
        let filters = await this.get(types_1.StorageKey.FILTERS); // Returns serialized FeedFilterSettings
        if (filters) {
            (0, feed_filters_1.buildFiltersFromArgs)(filters);
        }
        else {
            filters = (0, feed_filters_1.buildNewFilterSettings)();
            await this.setFilters(feed_filters_1.DEFAULT_FILTERS); // DEFAULT_FILTERS not the filters we just built
        }
        return filters;
    }
    // Serialize the FeedFilterSettings object
    static async setFilters(filters) {
        const filterSettings = {
            feedFilterSectionArgs: Object.values(filters.filterSections).map(section => section.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        };
        await this.set(types_1.StorageKey.FILTERS, filterSettings);
    }
    // TODO: this name is too close to the overridden method in MastodonApiCache
    static async getFollowedAccts() {
        let followedAccounts = await this.get(types_1.StorageKey.FOLLOWED_ACCOUNTS);
        followedAccounts = (followedAccounts ?? []);
        return followedAccounts.map((a) => new account_1.default(a));
    }
    static async getUserData() {
        const followedAccounts = await this.getFollowedAccts();
        const followedTags = await this.get(types_1.StorageKey.FOLLOWED_TAGS);
        const serverSideFilters = await this.get(types_1.StorageKey.SERVER_SIDE_FILTERS);
        const blockedAccounts = await this.get(types_1.StorageKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.get(types_1.StorageKey.MUTED_ACCOUNTS);
        const allMutedAccounts = (mutedAccounts ?? []).concat(blockedAccounts ?? []).map((a) => new account_1.default(a));
        return {
            followedAccounts: account_1.default.buildAccountNames(followedAccounts),
            followedTags: (0, collection_helpers_1.countValues)(followedTags ?? [], tag => tag.name),
            mutedAccounts: account_1.default.buildAccountNames(allMutedAccounts),
            serverSideFilters: serverSideFilters ?? {},
        };
    }
    static async logAppOpen() {
        let numAppOpens = (await this.get(types_1.StorageKey.OPENINGS) || 0) + 1;
        await this.set(types_1.StorageKey.OPENINGS, numAppOpens);
        await this.set(types_1.StorageKey.LAST_OPENED, new Date().getTime());
    }
    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(types_1.StorageKey.LAST_OPENED);
        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`Only ${numAppOpens} app opens; returning 0 for getLastOpenedTimestamp() instead of ${lastOpenedInt}`);
            return 0;
        }
        console.log(`lastOpenedTimestamp (${numAppOpens} appOpens): ${lastOpenedInt} (${new Date(lastOpenedInt)})`);
        return lastOpenedInt;
    }
    static async getNumAppOpens() {
        let numAppOpens = await this.get(types_1.StorageKey.OPENINGS) || 0;
        console.debug(`getNumAppOpens() returning ${numAppOpens}`);
        return numAppOpens;
    }
    static async getIdentity() {
        const user = await localforage_1.default.getItem(types_1.StorageKey.USER);
        return user ? new account_1.default(user) : null;
    }
    // TODO: the storage key is not prepended with the user ID (maybe that's OK?)
    static async setIdentity(user) {
        console.debug(`Setting fedialgo user identity to:`, user);
        await localforage_1.default.setItem(types_1.StorageKey.USER, user.serialize());
    }
    static async getFeed() {
        let cachedToots = await this.get(types_1.StorageKey.TIMELINE);
        let toots = (cachedToots ?? []); // Status doesn't include all our Toot props but it should be OK?
        return toots.map(t => new toot_1.default(t));
    }
    static async setFeed(timeline) {
        await this.set(types_1.StorageKey.TIMELINE, timeline.map(t => t.serialize()));
    }
    static async setTrending(trendingData) {
        const data = {
            links: trendingData.links,
            tags: trendingData.tags,
            toots: trendingData.toots.map(t => t.serialize()),
        };
        await this.set(types_1.StorageKey.TRENDING, data);
    }
    static async getTrending() {
        const trendingData = await this.get(types_1.StorageKey.TRENDING);
        return {
            links: (trendingData?.links ?? []),
            tags: (trendingData?.tags ?? []),
            toots: (trendingData?.toots ?? []).map((t) => new toot_1.default(t)),
        };
    }
    // Get the value at the given key (with the user ID as a prefix)
    static async get(key) {
        return await localforage_1.default.getItem(await this.buildKey(key));
    }
    // Set the value at the given key (with the user ID as a prefix)
    static async set(key, value) {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, value);
        await localforage_1.default.setItem(storageKey, value);
    }
    static async remove(key) {
        const storageKey = await this.buildKey(key);
        console.debug(`[STORAGE] Removing value at key: ${storageKey}`);
        await localforage_1.default.removeItem(storageKey);
    }
    static async buildKey(key) {
        const user = await this.getIdentity();
        if (user) {
            return `${user.id}_${key}`;
        }
        else {
            throw new Error("No user identity found");
        }
    }
}
exports.default = Storage;
;
//# sourceMappingURL=Storage.js.map