"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
const localforage_1 = __importDefault(require("localforage"));
const account_1 = __importDefault(require("./api/objects/account"));
const toot_1 = __importStar(require("./api/objects/toot"));
const time_helpers_1 = require("./helpers/time_helpers");
const feed_filters_1 = require("./filters/feed_filters");
const config_1 = require("./config");
const string_helpers_1 = require("./helpers/string_helpers");
const types_1 = require("./types");
class Storage {
    static config = Object.assign({}, config_1.DEFAULT_CONFIG);
    // Clear everything but preserve the user's identity and weightings
    static async clearAll() {
        console.log(`[STORAGE] Clearing all storage`);
        const user = await this.getIdentity();
        const weights = await this.getWeightings();
        await localforage_1.default.clear();
        if (user) {
            console.log(`[STORAGE] Cleared storage for user ${user.webfingerURI}, keeping weights:`, weights);
            await this.setIdentity(user);
            if (weights)
                await this.setWeightings(weights);
        }
        else {
            console.warn(`[STORAGE] No user identity found, cleared storage anyways`);
        }
    }
    // Get the value at the given key (with the user ID as a prefix)
    static async get(key) {
        const withTimestamp = await localforage_1.default.getItem(await this.buildKey(key));
        if (!withTimestamp) {
            return null;
        }
        else if (!withTimestamp.updatedAt) {
            // Code to handle upgrades of existing users who won't have the updatedAt / value format in browser storage
            console.warn(`[STORAGE] No updatedAt timestamp found for ${key}, likely due to a fedialgo upgrade. Clearing cache.`);
            await this.remove(key);
            return null;
        }
        return withTimestamp.value;
    }
    // TODO: This might not be the right place for this. Also should it be cached in the browser storage?
    static getConfig() {
        return this.config;
    }
    // Get the value at the given key (with the user ID as a prefix) but coerce it to an array if there's nothing there
    static async getCoerced(key) {
        let value = await this.get(key);
        if (!value) {
            value = [];
        }
        else if (!Array.isArray(value)) {
            (0, string_helpers_1.logAndThrowError)(`[Storage] Expected array at '${key}' but got`, value);
        }
        return value;
    }
    // Get the timeline toots
    static async getFeed() {
        return await this.getToots(types_1.StorageKey.TIMELINE);
    }
    // Get the user's saved timeline filter settings
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
    // Generic method for deserializing stored toots
    static async getToots(key) {
        const toots = await this.get(key);
        return toots ? toots.map(t => new toot_1.default(t)) : null;
    }
    // Get trending tags, toots, and links as a single TrendingStorage object
    static async getTrending() {
        return {
            links: await this.getCoerced(types_1.StorageKey.FEDIVERSE_TRENDING_LINKS),
            tags: await this.getCoerced(types_1.StorageKey.FEDIVERSE_TRENDING_TAGS),
            toots: (await this.getToots(types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS)) ?? [],
        };
    }
    // Get a collection of information about the user's followed accounts, tags, blocks, etc.
    static async getUserData() {
        const followedAccounts = await this.getCoerced(types_1.StorageKey.FOLLOWED_ACCOUNTS);
        const followedTags = await this.getCoerced(types_1.StorageKey.FOLLOWED_TAGS);
        const serverSideFilters = await this.getCoerced(types_1.StorageKey.SERVER_SIDE_FILTERS);
        // TODO: unify blocked and muted account logic?
        const blockedAccounts = await this.getCoerced(types_1.StorageKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.getCoerced(types_1.StorageKey.MUTED_ACCOUNTS);
        const silencedAccounts = mutedAccounts.concat(blockedAccounts).map((a) => new account_1.default(a));
        return {
            followedAccounts: account_1.default.buildAccountNames(followedAccounts.map(a => new account_1.default(a))),
            followedTags: followedTags,
            mutedAccounts: account_1.default.buildAccountNames(silencedAccounts),
            serverSideFilters: serverSideFilters,
        };
    }
    // Return true if the data stored at 'key' is stale and should be refetched
    static async isDataStale(key) {
        const staleDataConfig = Storage.getConfig().staleDataSeconds;
        const staleAfterSeconds = staleDataConfig[key] ?? Storage.getConfig().staleDataDefaultSeconds;
        const dataAgeInSeconds = await this.secondsSinceLastUpdated(key);
        const numAppOpens = await this.getNumAppOpens();
        const logPrefix = `[isDataStale ${key}]`;
        let secondsLogMsg = `(dataAgeInSeconds: ${dataAgeInSeconds?.toFixed(0).toLocaleString()}`;
        secondsLogMsg += `, staleAfterSeconds: ${staleAfterSeconds.toLocaleString()}`;
        secondsLogMsg += `, numAppOpens is ${numAppOpens})`;
        if (numAppOpens <= 1) {
            // TODO: this feels like a very janky work around to the initial load issue
            console.debug(`${logPrefix} numAppOpens=${numAppOpens} means initial load, data not stale ${secondsLogMsg}`);
            return false;
        }
        if (dataAgeInSeconds == null) {
            console.log(`${logPrefix} no value for dataAgeInSeconds so data is stale ${secondsLogMsg}`);
            return true;
        }
        else if (dataAgeInSeconds > staleAfterSeconds) {
            console.log(`${logPrefix} Data is stale ${secondsLogMsg}`);
            return true;
        }
        else {
            console.debug(`${logPrefix} Cached data is still fresh, no need to refetch ${secondsLogMsg}`);
            return false;
        }
    }
    static async logAppOpen() {
        let numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(types_1.StorageKey.OPENINGS, numAppOpens);
        await this.set(types_1.StorageKey.LAST_OPENED, new Date().getTime());
    }
    // Return the user's stored timeline weightings
    static async getWeightings() {
        const weightings = await this.get(types_1.StorageKey.WEIGHTS);
        return (weightings ?? {});
    }
    // Delete the value at the given key (with the user ID as a prefix)
    static async remove(key) {
        const storageKey = await this.buildKey(key);
        console.log(`[STORAGE] Removing value at key: ${storageKey}`);
        await localforage_1.default.removeItem(storageKey);
    }
    // Set the value at the given key (with the user ID as a prefix)
    static async set(key, value) {
        const storageKey = await this.buildKey(key);
        const updatedAt = new Date().toISOString();
        const withTimestamp = { updatedAt, value };
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, withTimestamp);
        await localforage_1.default.setItem(storageKey, withTimestamp);
    }
    // Store the current timeline toots
    static async setFeed(timeline) {
        await this.storeToots(types_1.StorageKey.TIMELINE, timeline);
    }
    // Serialize the FeedFilterSettings object
    static async setFilters(filters) {
        const filterSettings = {
            feedFilterSectionArgs: Object.values(filters.filterSections).map(section => section.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        };
        await this.set(types_1.StorageKey.FILTERS, filterSettings);
    }
    // Store the fedialgo user's Account object
    // TODO: the storage key is not prepended with the user ID (maybe that's OK?)
    static async setIdentity(user) {
        console.debug(`Setting fedialgo user identity to:`, user);
        await localforage_1.default.setItem(types_1.StorageKey.USER, user.serialize());
    }
    static async setWeightings(userWeightings) {
        await this.set(types_1.StorageKey.WEIGHTS, userWeightings);
    }
    // Generic method for serializing toots to storage
    static async storeToots(key, toots) {
        const serializedToots = toots.map(t => t.serialize());
        await this.set(key, serializedToots);
    }
    //////////////////////////////
    //     Private methods      //
    //////////////////////////////
    // Build a string that prepends the user ID to the key
    static async buildKey(key) {
        const user = await this.getIdentity();
        if (!user)
            (0, string_helpers_1.logAndThrowError)(`[Storage] No user identity found`);
        return `${user.id}_${key}`;
    }
    // Get the user identity from storage
    static async getIdentity() {
        const user = await localforage_1.default.getItem(types_1.StorageKey.USER);
        return user ? new account_1.default(user) : null;
    }
    // Get the timestamp the app was last opened // TODO: currently unused
    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(types_1.StorageKey.LAST_OPENED);
        const logPrefix = `[getLastOpenedTimestamp()]`;
        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`${logPrefix} Only ${numAppOpens} app opens; returning 0 instead of ${lastOpenedInt}`);
            return;
        }
        console.log(`${logPrefix} last opened ${(0, time_helpers_1.quotedISOFmt)(new Date(lastOpenedInt))} (${numAppOpens} appOpens)`);
        return lastOpenedInt;
    }
    // Get the number of times the app has been opened by this user
    static async getNumAppOpens() {
        return await this.get(types_1.StorageKey.OPENINGS) ?? 0;
    }
    // Return the seconds from the updatedAt stored at 'key' and now
    static async secondsSinceLastUpdated(key) {
        const withTimestamp = await localforage_1.default.getItem(await this.buildKey(key));
        if (withTimestamp) {
            return (0, time_helpers_1.ageInSeconds)(withTimestamp.updatedAt);
        }
        else {
            console.debug(`[${key}] secondsSinceLastUpdated(): No stored object found at '${key}'`);
            return null;
        }
    }
    // Return the number of seconds since the most recent toot in the stored timeline   // TODO: unused
    static async secondsSinceMostRecentToot() {
        const timelineToots = await this.getToots(types_1.StorageKey.TIMELINE);
        if (!timelineToots)
            return null;
        const mostRecent = (0, toot_1.mostRecentTootedAt)(timelineToots);
        if (mostRecent) {
            return (0, time_helpers_1.ageInSeconds)(mostRecent.getTime());
        }
        else {
            console.debug(`No most recent toot found`);
            return null;
        }
    }
}
exports.default = Storage;
;
//# sourceMappingURL=Storage.js.map