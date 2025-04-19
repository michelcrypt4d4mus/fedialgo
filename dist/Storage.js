"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
const localforage_1 = __importDefault(require("localforage"));
const numeric_filter_1 = __importDefault(require("./filters/numeric_filter"));
const property_filter_1 = __importDefault(require("./filters/property_filter"));
const toot_1 = __importDefault(require("./api/objects/toot"));
const numeric_filter_2 = require("./filters/numeric_filter");
const config_1 = require("./config");
const types_1 = require("./types");
class Storage {
    static config = Object.assign({}, config_1.DEFAULT_CONFIG);
    // TODO: consider actually storing the config in browser storage.
    static getConfig() {
        return this.config;
    }
    static async getWeightings() {
        const weightings = await this.get(types_1.Key.WEIGHTS);
        return (weightings ?? {});
    }
    static async setWeightings(userWeightings) {
        await this.set(types_1.Key.WEIGHTS, userWeightings);
    }
    static async getFilters() {
        let filters = await this.get(types_1.Key.FILTERS); // Returns serialized FeedFilterSettings
        if (filters) {
            populateFiltersFromArgs(filters);
        }
        else {
            filters = (0, config_1.buildNewFilterSettings)();
            await this.setFilters(config_1.DEFAULT_FILTERS); // DEFAULT_FILTERS not the filters we just built
        }
        // console.debug(`[Storage] getFilters() returning:`, filters);
        return filters;
    }
    // Serialize the FeedFilterSettings object
    static async setFilters(filters) {
        const filterSettings = {
            feedFilterSectionArgs: Object.values(filters.filterSections).map(section => section.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        };
        await this.set(types_1.Key.FILTERS, filterSettings);
    }
    // TODO: this name is too close to the overridden method in MastodonApiCache
    static async getFollowedAccts() {
        const followedAccounts = await this.get(types_1.Key.FOLLOWED_ACCOUNTS);
        return (followedAccounts ?? []);
    }
    static async logAppOpen() {
        let numAppOpens = (await this.get(types_1.Key.OPENINGS) || 0) + 1;
        await this.set(types_1.Key.OPENINGS, numAppOpens);
        await this.set(types_1.Key.LAST_OPENED, new Date().getTime());
    }
    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(types_1.Key.LAST_OPENED);
        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`Only ${numAppOpens} app opens; returning 0 for getLastOpenedTimestamp() instead of ${lastOpenedInt}`);
            return 0;
        }
        console.log(`lastOpenedTimestamp (${numAppOpens} appOpens): ${lastOpenedInt} (${new Date(lastOpenedInt)})`);
        return lastOpenedInt;
    }
    static async getNumAppOpens() {
        let numAppOpens = await this.get(types_1.Key.OPENINGS) || 0;
        console.debug(`getNumAppOpens() returning ${numAppOpens}`);
        return numAppOpens;
    }
    static async getIdentity() {
        return await localforage_1.default.getItem(types_1.Key.USER);
    }
    static async setIdentity(user) {
        console.debug(`Setting identity to:`, user); // TODO: this is insecure logging
        await localforage_1.default.setItem(types_1.Key.USER, user);
    }
    static async getFeed() {
        let cachedToots = await this.get(types_1.Key.TIMELINE);
        let toots = (cachedToots ?? []); // Status doesn't include all our Toot props but it should be OK?
        return toots.map(t => new toot_1.default(t));
    }
    static async setFeed(timeline) {
        await this.set(types_1.Key.TIMELINE, timeline.map(t => t.serialize()));
    }
    static async setTrending(links, tags, _toots) {
        const toots = _toots.map(t => t.serialize());
        await this.set(types_1.Key.TRENDING, { links, tags, toots });
    }
    static async getTrending() {
        const trendingData = await this.get(types_1.Key.TRENDING);
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
// For building a FeedFilterSettings object from the serialized version. Mutates object.
function populateFiltersFromArgs(serializedFilterSettings) {
    serializedFilterSettings.filterSections ??= {};
    serializedFilterSettings.numericFilters ??= {};
    serializedFilterSettings.feedFilterSectionArgs.forEach((args) => {
        serializedFilterSettings.filterSections[args.title] = new property_filter_1.default(args);
    });
    serializedFilterSettings.numericFilterArgs.forEach((args) => {
        serializedFilterSettings.numericFilters[args.title] = new numeric_filter_1.default(args);
    });
    // Fill in any missing values
    numeric_filter_2.FILTERABLE_SCORES.forEach(weightName => {
        serializedFilterSettings.numericFilters[weightName] ??= new numeric_filter_1.default({ title: weightName });
    });
}
;
//# sourceMappingURL=Storage.js.map