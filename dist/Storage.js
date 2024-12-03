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
    filteredLanguages: [],
    includeFollowedHashtags: true,
    includeFollowedAccounts: true,
    includeReposts: true,
    includeReplies: true,
    includeTrendingToots: true,
    onlyLinks: false,
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
        filters ??= exports.DEFAULT_FILTERS;
        return filters;
    }
    static async setFilters(filters) {
        await this.set(Key.FILTERS, filters);
    }
    static async logAppOpen() {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS));
        if (numAppOpens == null || isNaN(numAppOpens)) {
            await this.set(Key.OPENINGS, "1", true);
        }
        else {
            await this.set(Key.OPENINGS, (numAppOpens + 1).toString(), true);
        }
        await this.set(Key.LAST_OPENED, new Date().getTime().toString(), true);
    }
    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = parseInt(await this.get(Key.LAST_OPENED));
        console.log(`lastOpenedTimestamp (after ${numAppOpens} app opens) milliseconds: ${lastOpenedInt}`);
        if (numAppOpens <= 1) {
            console.log(`Only 1 numAppOpens so returning 0 for getLastOpenedTimestamp()`);
            return 0;
        }
        if (lastOpenedInt) {
            console.log(`lastOpenedTimestamp: ${new Date(lastOpenedInt)}`);
        }
        else {
            console.log("lastOpenedTimestamp not found");
        }
        return lastOpenedInt;
    }
    static async getNumAppOpens() {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS));
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
        toots ??= [];
        return toots;
    }
    static async setFeed(timeline) {
        await this.set(Key.TIMELINE, timeline);
    }
    // TODO: currently groupedByUser is always true ?
    static async get(key, groupedByUser = true, suffix = "") {
        const storageKey = await this.buildKey(key, groupedByUser, suffix);
        // console.debug(`[STORAGE] Retrieving value at key: ${storageKey}`);
        return await localforage_1.default.getItem(storageKey);
    }
    static async set(key, value, groupedByUser = true, suffix = "") {
        const storageKey = await this.buildKey(key, groupedByUser, suffix);
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, value);
        await localforage_1.default.setItem(storageKey, value);
    }
    static async remove(key, groupedByUser = true, suffix = "") {
        const storageKey = await this.buildKey(key, groupedByUser, suffix);
        console.debug(`[STORAGE] Removing value at key: ${storageKey}`);
        await localforage_1.default.removeItem(storageKey);
    }
    static async buildKey(key, groupedByUser = true, suffix = "") {
        const keyWithSuffix = (suffix === "") ? key : `${key}_${suffix}`;
        return groupedByUser ? await this.userPrefix(keyWithSuffix) : keyWithSuffix;
    }
    static async userPrefix(key) {
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