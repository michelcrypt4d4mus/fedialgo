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
const api_1 = __importDefault(require("./api/api"));
const toot_1 = __importStar(require("./api/objects/toot"));
const user_data_1 = __importDefault(require("./api/user_data"));
const time_helpers_1 = require("./helpers/time_helpers");
const feed_filters_1 = require("./filters/feed_filters");
const collection_helpers_1 = require("./helpers/collection_helpers");
const config_1 = require("./config");
const environment_helpers_1 = require("./helpers/environment_helpers");
const log_helpers_1 = require("./helpers/log_helpers");
const string_helpers_1 = require("./helpers/string_helpers");
const types_1 = require("./types");
// The cache values at these keys contain SerializedToot objects
const STORAGE_KEYS_WITH_TOOTS = [
    types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS,
    types_1.StorageKey.PARTICIPATED_TAG_TOOTS,
    types_1.StorageKey.TIMELINE,
    types_1.StorageKey.TRENDING_TAG_TOOTS,
];
const STORAGE_KEYS_WITH_ACCOUNTS = [
    types_1.StorageKey.BLOCKED_ACCOUNTS,
    types_1.StorageKey.FOLLOWED_ACCOUNTS,
    types_1.StorageKey.MUTED_ACCOUNTS,
    types_1.StorageKey.RECENT_NOTIFICATIONS,
];
const STORAGE_KEYS_WITH_UNIQUE_IDS = [
    ...STORAGE_KEYS_WITH_TOOTS,
    ...STORAGE_KEYS_WITH_ACCOUNTS,
    types_1.StorageKey.FAVOURITED_TOOTS,
    types_1.StorageKey.RECENT_NOTIFICATIONS,
    types_1.StorageKey.RECENT_USER_TOOTS,
    types_1.StorageKey.SERVER_SIDE_FILTERS,
];
const LOG_PREFIX = '[STORAGE]';
const logMsg = (s) => `${LOG_PREFIX} ${s}`;
const log = (s, ...args) => console.log(logMsg(s), ...args);
const warn = (s, ...args) => console.warn(logMsg(s), ...args);
const debug = (s, ...args) => console.debug(logMsg(s), ...args);
const trace = (s, ...args) => (0, log_helpers_1.traceLog)(logMsg(s), ...args);
class Storage {
    static config = Object.assign({}, config_1.DEFAULT_CONFIG);
    // Clear everything but preserve the user's identity and weightings
    static async clearAll() {
        log(`Clearing all storage...`);
        const user = await this.getIdentity();
        const weights = await this.getWeightings();
        await localforage_1.default.clear();
        if (user) {
            log(`Cleared storage for user ${user.webfingerURI}, keeping weights:`, weights);
            await this.setIdentity(user);
            if (weights)
                await this.setWeightings(weights);
        }
        else {
            warn(`No user identity found, cleared storage anyways`);
        }
    }
    // Get the value at the given key (with the user ID as a prefix)
    static async get(key) {
        const withTimestamp = await this.getStorableWithTimestamp(key);
        if (!withTimestamp) {
            return null;
        }
        else if (!withTimestamp.updatedAt) {
            // TODO: remove this logic eventually, it's only for upgrading existing users
            // Code to handle upgrades of existing users who won't have the updatedAt / value format in browser storage
            warn(`No updatedAt found for "${key}", likely due to a fedialgo upgrade. Clearing cache.`);
            await this.remove(key);
            return null;
        }
        if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(key) && environment_helpers_1.isDebugMode) {
            (0, collection_helpers_1.checkUniqueIDs)(withTimestamp.value, types_1.StorageKey.RECENT_USER_TOOTS);
        }
        if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            return withTimestamp.value.map(t => new toot_1.default(t));
        }
        else {
            return withTimestamp.value;
        }
    }
    static async getIfNotStale(key) {
        const logPrefix = `getIfNotStale("${key}"):`;
        const withTimestamp = await this.getStorableWithTimestamp(key);
        if (!withTimestamp?.updatedAt) {
            debug(`${logPrefix} No data found, returning null`);
            return null;
        }
        ;
        const updatedAt = new Date(withTimestamp.updatedAt);
        const staleAfterSeconds = Storage.getConfig().staleDataSeconds[key] ?? Storage.getConfig().staleDataDefaultSeconds;
        const dataAgeInSeconds = (0, time_helpers_1.ageInSeconds)(updatedAt);
        let secondsLogMsg = `(dataAgeInSeconds: ${(0, string_helpers_1.toLocaleInt)(dataAgeInSeconds)}`;
        secondsLogMsg += `, staleAfterSeconds: ${(0, string_helpers_1.toLocaleInt)(staleAfterSeconds)})`;
        if (dataAgeInSeconds > staleAfterSeconds) {
            log(`${logPrefix} Data is stale ${secondsLogMsg}`);
            return null;
        }
        let msg = `Cached data is still fresh ${secondsLogMsg}`;
        if (Array.isArray(withTimestamp.value))
            msg += ` (${withTimestamp.value.length} records)`;
        trace(`${logPrefix} ${msg}`);
        if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            trace(`${logPrefix} Deserializing toots...`);
            return withTimestamp.value.map(t => new toot_1.default(t));
        }
        else {
            return withTimestamp.value;
        }
    }
    // Generic method for deserializing stored Accounts
    static async getAccounts(key) {
        const accounts = await this.get(key);
        return accounts ? accounts.map(t => new account_1.default(t)) : null;
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
            (0, log_helpers_1.logAndThrowError)(`${LOG_PREFIX} Expected array at '${key}' but got`, value);
        }
        return value;
    }
    // Get the user's saved timeline filter settings
    static async getFilters() {
        const filters = await this.get(types_1.StorageKey.FILTERS);
        // Filters are saved in a serialized format that requires deserialization
        return filters ? (0, feed_filters_1.buildFiltersFromArgs)(filters) : null;
    }
    // Get trending tags, toots, and links as a single TrendingStorage object
    static async getTrending() {
        return {
            links: await this.getCoerced(types_1.StorageKey.FEDIVERSE_TRENDING_LINKS),
            tags: await this.getCoerced(types_1.StorageKey.FEDIVERSE_TRENDING_TAGS),
            toots: await this.getCoerced(types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS),
        };
    }
    // Get a collection of information about the user's followed accounts, tags, blocks, etc.
    static async getUserData() {
        // TODO: unify blocked and muted account logic?
        const blockedAccounts = await this.getCoerced(types_1.StorageKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.getCoerced(types_1.StorageKey.MUTED_ACCOUNTS);
        return user_data_1.default.buildFromData({
            followedAccounts: await this.getAccounts(types_1.StorageKey.FOLLOWED_ACCOUNTS) || [],
            followedTags: await this.getCoerced(types_1.StorageKey.FOLLOWED_TAGS),
            mutedAccounts: mutedAccounts.concat(blockedAccounts).map((a) => new account_1.default(a)),
            recentToots: await this.getCoerced(types_1.StorageKey.RECENT_USER_TOOTS),
            serverSideFilters: await this.getCoerced(types_1.StorageKey.SERVER_SIDE_FILTERS),
        });
    }
    // Return true if the data stored at 'key' either doesn't exist or is stale and should be refetched
    static async isDataStale(key) {
        return !(await this.getIfNotStale(key));
    }
    static async logAppOpen() {
        let numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(types_1.StorageKey.OPENINGS, numAppOpens);
    }
    // Return the user's stored timeline weightings
    static async getWeightings() {
        const weightings = await this.get(types_1.StorageKey.WEIGHTS);
        return (weightings ?? {});
    }
    // Delete the value at the given key (with the user ID as a prefix)
    static async remove(key) {
        const storageKey = await this.buildKey(key);
        log(`Removing value at key: ${storageKey}`);
        await localforage_1.default.removeItem(storageKey);
    }
    // Set the value at the given key (with the user ID as a prefix)
    static async set(key, value) {
        const storageKey = await this.buildKey(key);
        const updatedAt = new Date().toISOString();
        const withTimestamp = { updatedAt, value };
        trace(`Setting value at key: ${storageKey} to value:`, withTimestamp);
        if (key in STORAGE_KEYS_WITH_TOOTS) {
            trace(`Serializing toots at ${key}...`);
            await this.storeToots(key, value);
        }
        else {
            await localforage_1.default.setItem(storageKey, withTimestamp);
        }
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
        debug(`Setting fedialgo user identity to:`, user);
        await localforage_1.default.setItem(types_1.StorageKey.USER, user.serialize());
    }
    static async setWeightings(userWeightings) {
        await this.set(types_1.StorageKey.WEIGHTS, userWeightings);
    }
    //////////////////////////////
    //     Private methods      //
    //////////////////////////////
    // Build a string that prepends the user ID to the key
    static async buildKey(key) {
        let user = await this.getIdentity();
        if (!user) {
            warn(`No user identity found, checking MastoApi...`);
            if (api_1.default.instance.user) {
                warn(`No user identity found! MastoApi has a user ID, using that instead`);
                user = api_1.default.instance.user;
                await this.setIdentity(user);
            }
            else {
                (0, log_helpers_1.logAndThrowError)(`${LOG_PREFIX} No user identity found! Cannot build key for ${key}`);
            }
        }
        return `${user.id}_${key}`;
    }
    // Get the user identity from storage
    static async getIdentity() {
        const user = await localforage_1.default.getItem(types_1.StorageKey.USER);
        return user ? new account_1.default(user) : null;
    }
    // Get the number of times the app has been opened by this user
    static async getNumAppOpens() {
        return await this.get(types_1.StorageKey.OPENINGS) ?? 0;
    }
    // Get the raw StorableWithTimestamp object
    static async getStorableWithTimestamp(key) {
        const withTimestamp = await localforage_1.default.getItem(await this.buildKey(key));
        return withTimestamp ?? null;
    }
    // Get the timestamp the app was last opened // TODO: currently unused
    static async lastOpenedAt() {
        return await this.updatedAt(types_1.StorageKey.OPENINGS);
    }
    // Return the seconds from the updatedAt stored at 'key' and now
    static async secondsSinceLastUpdated(key) {
        const updatedAt = await this.updatedAt(key);
        return updatedAt ? (0, time_helpers_1.ageInSeconds)(updatedAt) : null;
    }
    // Generic method for serializing toots to storage
    static async storeToots(key, toots) {
        const serializedToots = toots.map(t => t.serialize());
        await this.set(key, serializedToots);
    }
    static async updatedAt(key) {
        const withTimestamp = await this.getStorableWithTimestamp(key);
        return withTimestamp?.updatedAt ? new Date(withTimestamp.updatedAt) : null;
    }
    // Return the number of seconds since the most recent toot in the stored timeline   // TODO: unused
    static async secondsSinceMostRecentToot() {
        const timelineToots = await this.get(types_1.StorageKey.TIMELINE);
        if (!timelineToots)
            return null;
        const mostRecent = (0, toot_1.mostRecentTootedAt)(timelineToots);
        if (mostRecent) {
            return (0, time_helpers_1.ageInSeconds)(mostRecent.getTime());
        }
        else {
            debug(`No most recent toot found`);
            return null;
        }
    }
}
exports.default = Storage;
;
//# sourceMappingURL=Storage.js.map