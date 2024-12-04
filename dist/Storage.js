"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FILTERS = exports.Key = void 0;
const localforage_1 = __importDefault(require("localforage"));
var Key;
(function (Key) {
    Key["CORE_SERVER"] = "coreServer";
    Key["FILTERS"] = "filters";
    Key["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    Key["FOLLOWED_TAGS"] = "FollowedTags";
    Key["LAST_OPENED"] = "lastOpened";
    Key["OPENINGS"] = "openings";
    Key["RECENT_TOOTS"] = "recentToots";
    Key["REPLIED_TO"] = "MostRepliedAccounts";
    Key["TIMELINE"] = "timeline";
    Key["TOP_FAVS"] = "Favs";
    Key["TOP_INTERACTS"] = "Interactions";
    Key["TOP_REBLOGS"] = "MostRetootedAccounts";
    Key["USER"] = "algouser";
    Key["WEIGHTS"] = "weights";
})(Key || (exports.Key = Key = {}));
;
exports.DEFAULT_FILTERS = {
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
};
class Storage {
    static async getWeightings() {
        let weightings = await this.get(Key.WEIGHTS);
        weightings ??= {};
        return weightings;
    }
    static async setWeightings(userWeightings) {
        await this.set(Key.WEIGHTS, userWeightings);
    }
    static async getFilters() {
        let filters = await this.get(Key.FILTERS);
        if (!filters) {
            console.debug(`getFilters() returning DEFAULT_FILTERS:`, filters);
            filters = Object.assign({}, exports.DEFAULT_FILTERS);
            await this.setFilters(filters);
        }
        return filters;
    }
    static async setFilters(filters) {
        await this.set(Key.FILTERS, filters);
    }
    // TODO: this name is too close to the overridden method in MastodonApiCache
    static async getFollowedAccts() {
        let followedAccounts = await this.get(Key.FOLLOWED_ACCOUNTS);
        if (!followedAccounts) {
            return null;
        }
        else {
            return followedAccounts;
        }
    }
    static async logAppOpen() {
        let numAppOpens = (parseInt(await this.get(Key.OPENINGS)) || 0) + 1;
        await this.set(Key.OPENINGS, numAppOpens);
        await this.set(Key.LAST_OPENED, new Date().getTime().toString());
    }
    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = parseInt(await this.get(Key.LAST_OPENED));
        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`Only ${numAppOpens} app opens; returning 0 for getLastOpenedTimestamp() instead of ${lastOpenedInt}`);
            return 0;
        }
        console.log(`lastOpenedTimestamp (${numAppOpens} appOpens): ${lastOpenedInt} (${new Date(lastOpenedInt)})`);
        return lastOpenedInt;
    }
    static async getNumAppOpens() {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS));
        console.debug(`getNumAppOpens() returning ${numAppOpens}`);
        return numAppOpens || 0;
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
        toots ??= [];
        return toots;
    }
    static async setFeed(timeline) {
        await this.set(Key.TIMELINE, timeline);
    }
    // Get the value at the given key (with the user ID as a prefix)
    // TODO make protected again
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