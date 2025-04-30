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
const collection_helpers_1 = require("./helpers/collection_helpers");
const types_1 = require("./types");
class Storage {
    static config = Object.assign({}, config_1.DEFAULT_CONFIG);
    // TODO: This might not be the right place for this. Also should it be cached in the browser storage?
    static getConfig() {
        return this.config;
    }
    // Return the user's stored timeline weightings
    static async getWeightings() {
        const weightings = await this.get(types_1.StorageKey.WEIGHTS);
        return (weightings ?? {});
    }
    static async setWeightings(userWeightings) {
        await this.set(types_1.StorageKey.WEIGHTS, userWeightings);
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
    // Serialize the FeedFilterSettings object
    static async setFilters(filters) {
        const filterSettings = {
            feedFilterSectionArgs: Object.values(filters.filterSections).map(section => section.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        };
        await this.set(types_1.StorageKey.FILTERS, filterSettings);
    }
    // Get a collection of information about the user's followed accounts, tags, blocks, etc.
    static async getUserData() {
        const followedAccounts = await this.get(types_1.StorageKey.FOLLOWED_ACCOUNTS);
        const followedTags = await this.get(types_1.StorageKey.FOLLOWED_TAGS);
        const serverSideFilters = await this.get(types_1.StorageKey.SERVER_SIDE_FILTERS);
        const blockedAccounts = await this.get(types_1.StorageKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.get(types_1.StorageKey.MUTED_ACCOUNTS);
        const allMutedAccounts = (mutedAccounts ?? []).concat(blockedAccounts ?? []).map((a) => new account_1.default(a));
        return {
            followedAccounts: account_1.default.buildAccountNames((followedAccounts ?? []).map(a => new account_1.default(a))),
            followedTags: (0, collection_helpers_1.countValues)(followedTags ?? [], tag => tag.name),
            mutedAccounts: account_1.default.buildAccountNames(allMutedAccounts),
            serverSideFilters: serverSideFilters ?? {},
        };
    }
    static async logAppOpen() {
        let numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(types_1.StorageKey.OPENINGS, numAppOpens);
        await this.set(types_1.StorageKey.LAST_OPENED, new Date().getTime());
    }
    // Get the user identity from storage
    static async getIdentity() {
        const user = await localforage_1.default.getItem(types_1.StorageKey.USER);
        return user ? new account_1.default(user) : null;
    }
    // TODO: the storage key is not prepended with the user ID (maybe that's OK?)
    static async setIdentity(user) {
        console.debug(`Setting fedialgo user identity to:`, user);
        await localforage_1.default.setItem(types_1.StorageKey.USER, user.serialize());
    }
    // Get the timeline toots
    static async getFeed() {
        return await this.getToots(types_1.StorageKey.TIMELINE);
    }
    // Store the current timeline toots
    static async setFeed(timeline) {
        await this.storeToots(types_1.StorageKey.TIMELINE, timeline);
    }
    // Generic method for deserializing stored toots
    static async getToots(key) {
        const toots = await this.get(key);
        return (toots ?? []).map(t => new toot_1.default(t));
    }
    // Generic method for serializing toots to storage
    static async storeToots(key, toots) {
        const serializedToots = toots.map(t => t.serialize());
        await this.set(key, serializedToots);
    }
    // Get trending tags, toots, and links as a single TrendingStorage object
    static async getTrending() {
        return {
            links: ((await this.get(types_1.StorageKey.FEDIVERSE_TRENDING_LINKS)) ?? []),
            tags: ((await this.get(types_1.StorageKey.FEDIVERSE_TRENDING_TAGS)) ?? []),
            toots: await this.getToots(types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS),
        };
    }
    // Return true if the timeline and user data is stale and should be reloaded
    static async isDataStale(key) {
        const numAppOpens = await this.getNumAppOpens();
        let logPrefix = `[isDataStale`;
        let seconds;
        if (key) {
            logPrefix += ` ${key}]`;
            seconds = await this.secondsSinceLastUpdated(key);
        }
        else {
            logPrefix += `]`;
            seconds = await this.secondsSinceMostRecentToot();
            if (seconds)
                console.log(`${logPrefix} No StorageKey so using secondsSinceMostRecentToot(): ${seconds} seconds`);
        }
        if (numAppOpens <= 1) {
            console.debug(`${logPrefix} numAppOpens is ${JSON.stringify(numAppOpens)} so initial load; data not stale (${seconds} seconds)`);
            return false;
        }
        if (!seconds) {
            console.debug(`${logPrefix} No existing updatedAt so data is stale (returned '${JSON.stringify(seconds)}')`);
            return true;
        }
        else if (seconds > this.getConfig().staleDataSeconds) {
            console.debug(`${logPrefix} Data is stale data after ${seconds} seconds...`);
            return true;
        }
        else {
            console.debug(`${logPrefix} Remote data is still fresh (${seconds} seconds old), no need to reload.`);
            return false;
        }
    }
    // Seconds since the app was last opened  // TODO: currently unused
    static async secondsSinceLastOpened() {
        const lastOpened = await this.getLastOpenedTimestamp();
        return lastOpened ? (0, time_helpers_1.ageOfTimestampInSeconds)(lastOpened) : undefined;
    }
    static async secondsSinceLastUpdated(key) {
        const withTimestamp = await localforage_1.default.getItem(await this.buildKey(key));
        if (withTimestamp) {
            const age = (0, time_helpers_1.ageInSeconds)(withTimestamp.updatedAt);
            console.debug(`[${key}] secondsSinceLastUpdated(): ${age}`);
            return age;
        }
        else {
            console.debug(`[${key}] secondsSinceLastUpdated(): No stored object found at key '${key}'`);
            return null;
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
    // Set the value at the given key (with the user ID as a prefix)
    static async set(key, value) {
        const storageKey = await this.buildKey(key);
        const updatedAt = new Date().toISOString();
        const withTimestamp = { updatedAt, value };
        console.debug(`[STORAGE] Setting value at key: ${storageKey} to value:`, withTimestamp);
        await localforage_1.default.setItem(storageKey, withTimestamp);
    }
    static async remove(key) {
        const storageKey = await this.buildKey(key);
        console.log(`[STORAGE] Removing value at key: ${storageKey}`);
        await localforage_1.default.removeItem(storageKey);
    }
    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = await this.get(types_1.StorageKey.LAST_OPENED);
        if (!lastOpenedInt || numAppOpens <= 1) {
            console.log(`Only ${numAppOpens} app opens; returning 0 for getLastOpenedTimestamp() instead of ${lastOpenedInt}`);
            return;
        }
        console.log(`lastOpenedTimestamp (${numAppOpens} appOpens): ${lastOpenedInt} (${new Date(lastOpenedInt)})`);
        return lastOpenedInt;
    }
    static async getNumAppOpens() {
        const numAppOpens = await this.get(types_1.StorageKey.OPENINGS);
        return numAppOpens || 0;
    }
    // Return the number of seconds since the most recent toot in the stored timeline
    static async secondsSinceMostRecentToot() {
        const timelineToots = await this.getToots(types_1.StorageKey.TIMELINE);
        const mostRecent = (0, toot_1.mostRecentTootedAt)(timelineToots);
        if (mostRecent) {
            return (0, time_helpers_1.ageOfTimestampInSeconds)(mostRecent.getTime());
        }
        else {
            console.debug(`No most recent toot found`);
            return null;
        }
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