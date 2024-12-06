"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Key = void 0;
const localforage_1 = __importDefault(require("localforage"));
const feed_filter_section_1 = __importDefault(require("./objects/feed_filter_section"));
const config_1 = require("./config");
var Key;
(function (Key) {
    Key["CORE_SERVER"] = "coreServer";
    Key["FILTERS"] = "filters";
    Key["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    Key["LAST_OPENED"] = "lastOpened";
    Key["OPENINGS"] = "openings";
    Key["RECENT_TOOTS"] = "recentToots";
    Key["TIMELINE"] = "timeline";
    Key["USER"] = "algouser";
    Key["WEIGHTS"] = "weights";
})(Key || (exports.Key = Key = {}));
;
class Storage {
    static config = Object.assign({}, config_1.DEFAULT_CONFIG);
    // TODO: consider actually storing the config in browser storage.
    static getConfig() {
        return this.config;
    }
    static async getWeightings() {
        const weightings = await this.get(Key.WEIGHTS);
        return (weightings ?? {});
    }
    static async setWeightings(userWeightings) {
        await this.set(Key.WEIGHTS, userWeightings);
    }
    static async getFilters() {
        let filters = await this.get(Key.FILTERS); // Returns serialized FeedFilterSettings
        if (filters) {
            filters.filterSections = (filters.feedFilterSectionArgs || []).reduce((acc, args) => {
                acc[args.title] = new feed_filter_section_1.default(args);
                return acc;
            }, {});
        }
        else {
            console.debug(`getFilters() building DEFAULT_FILTERS:`, filters);
            filters = Object.assign({}, config_1.DEFAULT_FILTERS);
            await this.setFilters(config_1.DEFAULT_FILTERS);
        }
        console.log(`[Storage] getFilters() returning:`, filters);
        return filters;
    }
    static async setFilters(filters) {
        // Serialize the FeedFilterSettings object
        // TODO: this sucks
        const settings = {
            feedFilterSectionArgs: Object.values(filters.filterSections).map(section => section.toArgs()),
            includeFollowedAccounts: filters.includeFollowedAccounts,
            includeFollowedHashtags: filters.includeFollowedHashtags,
            includeReplies: filters.includeReplies,
            includeReposts: filters.includeReposts,
            includeTrendingHashTags: filters.includeTrendingHashTags,
            includeTrendingToots: filters.includeTrendingToots,
            onlyLinks: filters.onlyLinks,
        };
        await this.set(Key.FILTERS, settings);
    }
    // TODO: this name is too close to the overridden method in MastodonApiCache
    static async getFollowedAccts() {
        const followedAccounts = await this.get(Key.FOLLOWED_ACCOUNTS);
        return (followedAccounts ?? []);
    }
    static async logAppOpen() {
        let numAppOpens = (await this.get(Key.OPENINGS) || 0) + 1;
        await this.set(Key.OPENINGS, numAppOpens);
        await this.set(Key.LAST_OPENED, new Date().getTime());
    }
    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(Key.LAST_OPENED);
        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`Only ${numAppOpens} app opens; returning 0 for getLastOpenedTimestamp() instead of ${lastOpenedInt}`);
            return 0;
        }
        console.log(`lastOpenedTimestamp (${numAppOpens} appOpens): ${lastOpenedInt} (${new Date(lastOpenedInt)})`);
        return lastOpenedInt;
    }
    static async getNumAppOpens() {
        let numAppOpens = await this.get(Key.OPENINGS) || 0;
        console.debug(`getNumAppOpens() returning ${numAppOpens}`);
        return numAppOpens;
    }
    static async getIdentity() {
        return await localforage_1.default.getItem(Key.USER);
    }
    static async setIdentity(user) {
        console.debug(`Setting identity to:`, user);
        await localforage_1.default.setItem(Key.USER, user);
    }
    static async getFeed() {
        let toots = await this.get(Key.TIMELINE);
        return (toots ?? []);
    }
    static async setFeed(timeline) {
        await this.set(Key.TIMELINE, timeline);
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