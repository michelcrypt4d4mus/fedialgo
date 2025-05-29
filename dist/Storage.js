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
exports.STORAGE_KEYS_WITH_ACCOUNTS = exports.STORAGE_KEYS_WITH_TOOTS = void 0;
/*
 * Use localForage to store and retrieve data from the browser's IndexedDB storage.
 */
const localforage_1 = __importDefault(require("localforage"));
const class_transformer_1 = require("class-transformer");
const account_1 = __importDefault(require("./api/objects/account"));
const api_1 = __importDefault(require("./api/api"));
const tag_list_1 = __importDefault(require("./api/tag_list"));
const toot_1 = __importStar(require("./api/objects/toot"));
const user_data_1 = __importDefault(require("./api/user_data"));
const time_helpers_1 = require("./helpers/time_helpers");
const feed_filters_1 = require("./filters/feed_filters");
const string_helpers_1 = require("./helpers/string_helpers");
const collection_helpers_1 = require("./helpers/collection_helpers");
const config_1 = require("./config");
const weight_presets_1 = require("./scorer/weight_presets");
const environment_helpers_1 = require("./helpers/environment_helpers");
const math_helper_1 = require("./helpers/math_helper");
const log_helpers_1 = require("./helpers/log_helpers");
const types_1 = require("./types");
exports.STORAGE_KEYS_WITH_TOOTS = Object.entries(types_1.CacheKey).reduce((keys, [k, v]) => k.endsWith('_TOOTS') ? keys.concat(v) : keys, []);
exports.STORAGE_KEYS_WITH_ACCOUNTS = Object.entries(types_1.CacheKey).reduce((keys, [k, v]) => k.endsWith('_ACCOUNTS') ? keys.concat(v) : keys, []);
const STORAGE_KEYS_WITH_UNIQUE_IDS = [
    ...exports.STORAGE_KEYS_WITH_TOOTS,
    ...exports.STORAGE_KEYS_WITH_ACCOUNTS,
    types_1.CacheKey.NOTIFICATIONS,
    types_1.CacheKey.SERVER_SIDE_FILTERS,
];
const LOG_PREFIX = '[STORAGE]';
const buildLogMsg = (s) => `${LOG_PREFIX} ${s}`;
const error = (s, ...args) => console.error(buildLogMsg(s), ...args);
const warn = (s, ...args) => console.warn(buildLogMsg(s), ...args);
const log = (s, ...args) => console.log(buildLogMsg(s), ...args);
const debug = (s, ...args) => console.debug(buildLogMsg(s), ...args);
const trace = (s, ...args) => (0, log_helpers_1.traceLog)(buildLogMsg(s), ...args);
// Configure localForage to use WebSQL as the driver
localforage_1.default.config({
    name: string_helpers_1.FEDIALGO,
    storeName: `${string_helpers_1.FEDIALGO}_user_data`,
});
class Storage {
    // Clear everything but preserve the user's identity and weightings
    static async clearAll() {
        log(`Clearing all storage...`);
        const user = await this.getIdentity();
        const weights = await this.getWeights();
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
        return this.deserialize(key, withTimestamp.value);
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
        const filters = await this.get(types_1.AlgorithmStorageKey.FILTERS);
        if (!filters)
            return null;
        try {
            if ((0, feed_filters_1.repairFilterSettings)(filters)) {
                warn(`Repaired old filter settings, updating...`);
                await this.set(types_1.AlgorithmStorageKey.FILTERS, filters);
            }
        }
        catch (e) {
            error(`Error repairing filter settings, returning null:`, e);
            await this.remove(types_1.AlgorithmStorageKey.FILTERS);
            return null;
        }
        // Filters are saved in a serialized format that requires deserialization
        return (0, feed_filters_1.buildFiltersFromArgs)(filters);
    }
    // Return null if the data is in storage is stale or doesn't exist
    static async getIfNotStale(key) {
        const withStaleness = await this.getWithStaleness(key);
        if (!withStaleness || withStaleness.isStale) {
            return null;
        }
        else {
            return withStaleness.obj;
        }
    }
    // Get trending tags, toots, and links as a single TrendingStorage object
    static async getTrendingData() {
        const trendingTags = await this.getCoerced(types_1.CacheKey.FEDIVERSE_TRENDING_TAGS);
        const trendingTagList = new tag_list_1.default(trendingTags);
        trendingTagList.removeInvalidTrendingTags(); // TODO: sucks to do this here...
        return {
            links: await this.getCoerced(types_1.CacheKey.FEDIVERSE_TRENDING_LINKS),
            tags: trendingTagList.topTags(),
            toots: await this.getCoerced(types_1.CacheKey.FEDIVERSE_TRENDING_TOOTS),
        };
    }
    // Return the user's stored timeline weightings or the default weightings if none are found
    static async getWeights() {
        let weights = await this.get(types_1.AlgorithmStorageKey.WEIGHTS);
        if (!weights)
            return JSON.parse(JSON.stringify(weight_presets_1.DEFAULT_WEIGHTS));
        let shouldSave = false;
        // If there are stored weights set any missing values to the default (possible in case of upgrades)
        Object.entries(weight_presets_1.DEFAULT_WEIGHTS).forEach(([key, defaultValue]) => {
            const value = weights[key];
            if (!(0, math_helper_1.isNumber)(value)) {
                warn(`Missing value for "${key}" in saved weights, setting to default: ${defaultValue}`);
                weights[key] = weight_presets_1.DEFAULT_WEIGHTS[key];
                shouldSave = true;
            }
        });
        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSave) {
            log(`Saving repaired user weights:`, weights);
            await Storage.setWeightings(weights);
        }
        return weights;
    }
    // Get the value at the given key (with the user ID as a prefix) and return it with its staleness
    static async getWithStaleness(key) {
        const logPrefix = `getWithStaleness("${key}"):`;
        const withTimestamp = await this.getStorableWithTimestamp(key);
        if (!withTimestamp?.updatedAt) {
            trace(`${logPrefix} No data found, returning null`);
            return null;
        }
        ;
        const dataAgeInMinutes = (0, time_helpers_1.ageInMinutes)(withTimestamp.updatedAt);
        const staleAfterMinutes = config_1.config.api.data[key]?.minutesUntilStale || config_1.config.api.minutesUntilStaleDefault;
        let minutesMsg = `(dataAgeInMinutes: ${(0, string_helpers_1.toLocaleInt)(dataAgeInMinutes)}`;
        minutesMsg += `, staleAfterMinutes: ${(0, string_helpers_1.toLocaleInt)(staleAfterMinutes)})`;
        let isStale = false;
        if (dataAgeInMinutes > staleAfterMinutes) {
            debug(`${logPrefix} Data is stale ${minutesMsg}`);
            isStale = true;
        }
        else {
            let msg = `Cached data is still fresh ${minutesMsg}`;
            if (Array.isArray(withTimestamp.value))
                msg += ` (${withTimestamp.value.length} records)`;
            trace(`${logPrefix} ${msg}`);
        }
        // Check for unique IDs in the stored data if we're in debug mode
        if (environment_helpers_1.isDebugMode && STORAGE_KEYS_WITH_UNIQUE_IDS.includes(key)) {
            (0, collection_helpers_1.checkUniqueIDs)(withTimestamp.value, key);
        }
        return {
            isStale,
            obj: this.deserialize(key, withTimestamp.value),
            updatedAt: new Date(withTimestamp.updatedAt),
        };
    }
    // Return true if the data stored at 'key' either doesn't exist or is stale and should be refetched
    static async isDataStale(key) {
        return !(await this.getIfNotStale(key));
    }
    // Get a collection of information about the user's followed accounts, tags, blocks, etc.
    static async loadUserData() {
        // TODO: unify blocked and muted account logic?
        const blockedAccounts = await this.getCoerced(types_1.CacheKey.BLOCKED_ACCOUNTS);
        const mutedAccounts = await this.getCoerced(types_1.CacheKey.MUTED_ACCOUNTS);
        return user_data_1.default.buildFromData({
            favouritedToots: await this.getCoerced(types_1.CacheKey.FAVOURITED_TOOTS),
            followedAccounts: await this.getCoerced(types_1.CacheKey.FOLLOWED_ACCOUNTS),
            followedTags: await this.getCoerced(types_1.CacheKey.FOLLOWED_TAGS),
            mutedAccounts: mutedAccounts.concat(blockedAccounts).map((a) => account_1.default.build(a)),
            recentToots: await this.getCoerced(types_1.CacheKey.RECENT_USER_TOOTS),
            serverSideFilters: await this.getCoerced(types_1.CacheKey.SERVER_SIDE_FILTERS),
        });
    }
    static async logAppOpen(user) {
        await Storage.setIdentity(user);
        const numAppOpens = (await this.getNumAppOpens()) + 1;
        await this.set(types_1.AlgorithmStorageKey.APP_OPENS, numAppOpens);
    }
    // Delete the value at the given key (with the user ID as a prefix)
    static async remove(key) {
        const storageKey = key == types_1.AlgorithmStorageKey.USER ? key : await this.buildKey(key);
        log(`Removing value at key: ${storageKey}`);
        await localforage_1.default.removeItem(storageKey);
    }
    // Set the value at the given key (with the user ID as a prefix)
    static async set(key, value) {
        const storageKey = await this.buildKey(key);
        const updatedAt = new Date().toISOString();
        const storableValue = this.serialize(key, value);
        const withTimestamp = { updatedAt, value: storableValue };
        trace(`Setting value at key: ${storageKey} to value:`, withTimestamp);
        await localforage_1.default.setItem(storageKey, withTimestamp);
    }
    // Serialize the FeedFilterSettings object
    static async setFilters(filters) {
        const filterSettings = {
            booleanFilterArgs: Object.values(filters.booleanFilters).map(section => section.toArgs()),
            numericFilterArgs: Object.values(filters.numericFilters).map(filter => filter.toArgs()),
        };
        await this.set(types_1.AlgorithmStorageKey.FILTERS, filterSettings);
    }
    static async setWeightings(userWeightings) {
        await this.set(types_1.AlgorithmStorageKey.WEIGHTS, userWeightings);
    }
    // Dump information about the size of the data stored in localForage
    static async storedObjsInfo() {
        const keyStrings = Object.values(types_1.CacheKey);
        const keys = await Promise.all(keyStrings.map(k => this.buildKey(k)));
        const storedData = await (0, collection_helpers_1.zipPromises)(keys, async (k) => localforage_1.default.getItem(k));
        storedData[types_1.AlgorithmStorageKey.USER] = await this.getIdentity(); // Stored differently
        console.log(`Loaded user identity:`, storedData[types_1.AlgorithmStorageKey.USER]);
        let totalBytes = 0;
        const storageInfo = Object.entries(storedData).reduce((info, [key, obj]) => {
            if (obj) {
                const value = key == types_1.AlgorithmStorageKey.USER ? obj : obj.value;
                const sizeInBytes = (0, log_helpers_1.sizeOf)(value);
                totalBytes += sizeInBytes;
                info[key] = {
                    bytes: sizeInBytes,
                    bytesStr: (0, string_helpers_1.byteString)(sizeInBytes),
                };
                if (Array.isArray(value)) {
                    info[key].numElements = value.length;
                    info[key].type = 'array';
                }
                else if (typeof value === 'object') {
                    info[key].numKeys = Object.keys(value).length;
                    info[key].type = 'object';
                }
                else {
                    console.warn(`Unknown type for key "${key}":`, value);
                }
            }
            else {
                info[key] = null;
            }
            return info;
        }, {});
        storageInfo.totalBytes = totalBytes;
        storageInfo.totalBytesStr = (0, string_helpers_1.byteString)(totalBytes);
        return storageInfo;
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
    static deserialize(key, value) {
        if (exports.STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            // Calling the plainToInstance with arrays as argument directly may or may not have caused an issue
            if (Array.isArray(value)) {
                return value.map((t) => (0, class_transformer_1.plainToInstance)(account_1.default, t));
            }
            else {
                warn(`Expected array of accounts at key "${key}", but got:`, value);
                return (0, class_transformer_1.plainToInstance)(account_1.default, value);
            }
        }
        else if (exports.STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            if (Array.isArray(value)) {
                return value.map((t) => (0, class_transformer_1.plainToInstance)(toot_1.default, t));
            }
            else {
                warn(`Expected array of toots at key "${key}", but got:`, value);
                return (0, class_transformer_1.plainToInstance)(toot_1.default, value);
            }
        }
        else {
            return value;
        }
    }
    // Get the user identity from storage
    static async getIdentity() {
        const user = await localforage_1.default.getItem(types_1.AlgorithmStorageKey.USER);
        return user ? (0, class_transformer_1.plainToInstance)(account_1.default, user) : null;
    }
    // Get the number of times the app has been opened by this user
    static async getNumAppOpens() {
        return await this.get(types_1.AlgorithmStorageKey.APP_OPENS) ?? 0;
    }
    // Get the raw StorableWithTimestamp object
    static async getStorableWithTimestamp(key) {
        const withTimestamp = await localforage_1.default.getItem(await this.buildKey(key));
        return withTimestamp ?? null;
    }
    // Return the seconds from the updatedAt stored at 'key' and now
    static async secondsSinceLastUpdated(key) {
        const updatedAt = await this.updatedAt(key);
        return updatedAt ? (0, time_helpers_1.ageInSeconds)(updatedAt) : null;
    }
    // Return the number of seconds since the most recent toot in the stored timeline   // TODO: unused
    static async secondsSinceMostRecentToot() {
        const timelineToots = await this.get(types_1.CacheKey.TIMELINE_TOOTS);
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
    static serialize(key, value) {
        if (exports.STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            return (0, class_transformer_1.instanceToPlain)(value);
        }
        else if (exports.STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            return (0, class_transformer_1.instanceToPlain)(value);
        }
        else {
            return value;
        }
    }
    // Store the fedialgo user's Account object
    // TODO: the storage key is not prepended with the user ID (maybe that's OK?)
    static async setIdentity(user) {
        trace(`Setting fedialgo user identity to:`, user);
        await localforage_1.default.setItem(types_1.AlgorithmStorageKey.USER, (0, class_transformer_1.instanceToPlain)(user));
    }
    static async updatedAt(key) {
        const withTimestamp = await this.getStorableWithTimestamp(key);
        return withTimestamp?.updatedAt ? new Date(withTimestamp.updatedAt) : null;
    }
}
exports.default = Storage;
;
//# sourceMappingURL=Storage.js.map