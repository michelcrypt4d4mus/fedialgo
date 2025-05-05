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
exports.TAGS = exports.STATUSES = exports.LINKS = exports.INSTANCE = void 0;
/*
 * Singleton class to wrap authenticated mastodon API calls to the user's home server
 * (unauthenticated calls are handled by the MastodonServer class).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
const change_case_1 = require("change-case");
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./objects/account"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importStar(require("./objects/toot"));
const user_data_1 = __importDefault(require("./user_data"));
const types_1 = require("../types");
const collection_helpers_1 = require("../helpers/collection_helpers");
const config_1 = require("../config");
const string_helpers_1 = require("../helpers/string_helpers");
const time_helpers_1 = require("../helpers/time_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const tag_1 = require("./objects/tag");
exports.INSTANCE = "instance";
exports.LINKS = "links";
exports.STATUSES = "statuses";
exports.TAGS = "tags";
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const DEFAULT_BREAK_IF = (pageOfResults, allResults) => false;
;
class MastoApi {
    static #instance; // Singleton instance of MastoApi
    api;
    homeDomain;
    user;
    userData; // Save UserData in the API object to avoid polling local storage over and over
    mutexes;
    requestSemphore; // Semaphore to limit concurrent requests
    // URL for a tag on the user's homeserver
    tagURL = (tag) => `${this.endpointURL(exports.TAGS)}/${tag.name}`;
    endpointURL = (endpoint) => `https://${this.homeDomain}/${endpoint}`;
    static init(api, user) {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }
        console.log(`[API] Initializing MastoApi instance with user:`, user.acct);
        MastoApi.#instance = new MastoApi(api, user);
    }
    ;
    static get instance() {
        if (!MastoApi.#instance)
            throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }
    ;
    constructor(api, user) {
        this.api = api;
        this.user = user;
        this.homeDomain = (0, string_helpers_1.extractDomain)(user.url);
        // Initialize mutexes for each StorageKey and a Semaphore for concurrent requests
        this.mutexes = {};
        for (const key in types_1.StorageKey)
            this.mutexes[types_1.StorageKey[key]] = new async_mutex_1.Mutex();
        this.requestSemphore = new async_mutex_1.Semaphore(config_1.Config.maxConcurrentRequestsInitial);
    }
    ;
    // Get the user's home timeline feed (recent toots from followed accounts and hashtags)
    async fetchHomeFeed(numToots, maxId) {
        const logPrefix = `[API ${types_1.StorageKey.HOME_TIMELINE}]`;
        const cutoffAt = (0, time_helpers_1.timelineCutoffAt)();
        numToots ||= config_1.Config.homeTimelineBatchSize;
        const statuses = await this.getApiRecords({
            fetch: this.api.v1.timelines.home.list,
            label: types_1.StorageKey.HOME_TIMELINE,
            maxId: maxId,
            maxRecords: numToots,
            skipCache: true,
            breakIf: (_newPageOfResults, allResults) => {
                const oldestTootAt = (0, toot_1.earliestTootedAt)(allResults) || new Date();
                // Break the toot fetching loop if we encounter a toot older than the cutoff date
                if (oldestTootAt && oldestTootAt <= cutoffAt) {
                    console.log(`${logPrefix} Halting (${(0, time_helpers_1.quotedISOFmt)(oldestTootAt)} <= ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)})`);
                    return true;
                }
                return false;
            }
        });
        const toots = await toot_1.default.buildToots(statuses, logPrefix);
        console.log(`${logPrefix} Retrieved ${toots.length} toots (oldest: ${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))})`);
        return toots;
    }
    ;
    async getBlockedAccounts() {
        const blockedAccounts = await this.getApiRecords({
            fetch: this.api.v1.blocks.list,
            label: types_1.StorageKey.BLOCKED_ACCOUNTS
        });
        return blockedAccounts.map(a => new account_1.default(a));
    }
    ;
    // Get accounts the user is following
    async getFollowedAccounts() {
        const followedAccounts = await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: types_1.StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: config_1.Config.maxFollowingAccountsToPull,
        });
        return followedAccounts.map(a => new account_1.default(a));
    }
    // Get hashtags the user is following
    async getFollowedTags() {
        const followedTags = await this.getApiRecords({
            fetch: this.api.v1.followedTags.list,
            label: types_1.StorageKey.FOLLOWED_TAGS
        });
        return followedTags.map(tag_1.repairTag);
    }
    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts() {
        const mutedAccounts = await this.getApiRecords({
            fetch: this.api.v1.mutes.list,
            label: types_1.StorageKey.MUTED_ACCOUNTS
        });
        const blockedAccounts = await this.getBlockedAccounts();
        return mutedAccounts.map(a => new account_1.default(a)).concat(blockedAccounts);
    }
    // Get an array of Toots the user has recently favourited
    // https://docs.joinmastodon.org/methods/favourites/#get
    // IDs of accounts ar enot monotonic so there's not really any way to
    // incrementally load this endpoint (the only way is pagination)
    async getRecentFavourites(moar) {
        const recentFaves = await this.getApiRecords({
            fetch: this.api.v1.favourites.list,
            label: types_1.StorageKey.FAVOURITED_TOOTS,
            // moar: moar,
        });
        (0, collection_helpers_1.checkUniqueIDs)(recentFaves, types_1.StorageKey.FAVOURITED_TOOTS);
        return recentFaves.map(t => new toot_1.default(t));
    }
    // Get the user's recent notifications
    async getRecentNotifications(moar) {
        const notifications = await this.getApiRecords({
            fetch: this.api.v1.notifications.list,
            label: types_1.StorageKey.RECENT_NOTIFICATIONS,
            moar: moar,
        });
        (0, collection_helpers_1.checkUniqueIDs)(notifications, types_1.StorageKey.RECENT_NOTIFICATIONS);
        return notifications;
    }
    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.getApiRecords() doesn't work here because endpoint doesn't paginate the same way
    async getServerSideFilters() {
        const logPrefix = `[API ${types_1.StorageKey.SERVER_SIDE_FILTERS}]`;
        const releaseMutex = await (0, log_helpers_1.lockMutex)(this.mutexes[types_1.StorageKey.SERVER_SIDE_FILTERS], logPrefix);
        const startTime = new Date();
        try {
            let filters = await Storage_1.default.getIfNotStale(types_1.StorageKey.SERVER_SIDE_FILTERS);
            if (!filters) {
                filters = await this.api.v2.filters.list();
                // Filter out filters that either are just warnings or don't apply to the home context
                filters = filters.filter(filter => {
                    // Before Mastodon 4.0 Filter objects lacked a 'context' property altogether
                    if (filter.context?.length > 0 && !filter.context.includes("home"))
                        return false;
                    if (filter.filterAction != "hide")
                        return false;
                    return true;
                });
                console.log(`${logPrefix} Retrieved ${filters.length} records ${(0, time_helpers_1.ageString)(startTime)}:`, filters);
                await Storage_1.default.set(types_1.StorageKey.SERVER_SIDE_FILTERS, filters);
            }
            return filters;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Get latest toots for a given tag using both the Search API and tag timeline API.
    // The two APIs give results with surprising little overlap (~80% of toots are unique)
    async getStatusesForTag(tag, numToots) {
        numToots ||= config_1.Config.numTootsPerTrendingTag;
        const tagToots = await Promise.all([
            this.searchForToots(tag.name, numToots),
            this.hashtagTimelineToots(tag, numToots),
        ]);
        return tagToots.flat();
    }
    // Collect and fully populate / dedup a collection of toots for an array of Tags
    async getStatusesForTags(tags) {
        console.log(`[getStatusesForTags()] called for ${tags.length} tags:`, tags.map(t => t.name));
        const tagToots = await Promise.all(tags.map(tag => this.getStatusesForTag(tag)));
        return tagToots.flat();
    }
    // Retrieve background data about the user that will be used for scoring etc.
    // Caches as an instance variable so the storage doesn't have to be hit over and over
    async getUserData() {
        // TODO: the staleness check probably belongs in the UserData class
        if (!this.userData || (await this.userData.isDataStale())) {
            this.userData = await user_data_1.default.getUserData();
        }
        return this.userData;
    }
    ;
    // Get the user's recent toots
    // NOTE: the user's own Toots don't have setDependentProperties() called on them!
    async getRecentUserToots(moar) {
        const recentToots = await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: types_1.StorageKey.RECENT_USER_TOOTS,
            moar: moar,
        });
        (0, collection_helpers_1.checkUniqueIDs)(recentToots, types_1.StorageKey.RECENT_USER_TOOTS);
        return recentToots.map(t => new toot_1.default(t));
    }
    ;
    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot) {
        const tootURI = toot.realURI();
        const urlDomain = (0, string_helpers_1.extractDomain)(tootURI);
        const logPrefix = `[resolveToot()]`;
        console.debug(`${logPrefix} called for`, toot);
        if (urlDomain == this.homeDomain)
            return toot;
        const lookupResult = await this.api.v2.search.list({ q: tootURI, resolve: true });
        if (!lookupResult?.statuses?.length) {
            (0, log_helpers_1.logAndThrowError)(`${logPrefix} got bad result for '${tootURI}'`, lookupResult);
        }
        const resolvedStatus = lookupResult.statuses[0];
        console.debug(`${logPrefix} found resolvedStatus for '${tootURI}:`, resolvedStatus);
        return new toot_1.default(resolvedStatus);
    }
    ;
    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr, maxRecords) {
        maxRecords = maxRecords || config_1.Config.defaultRecordsPerPage;
        let logPrefix = `[API searchForToots("${searchStr}")]`;
        const [semaphoreNum, releaseSemaphore] = await (0, log_helpers_1.lockSemaphore)(this.requestSemphore, logPrefix);
        const query = { limit: maxRecords, q: searchStr, type: exports.STATUSES };
        logPrefix += ` (semaphore ${semaphoreNum})`;
        const startedAt = new Date();
        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            console.debug(`${logPrefix} Retrieved ${statuses.length} ${(0, time_helpers_1.ageString)(startedAt)}`);
            return statuses;
        }
        catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${(0, time_helpers_1.ageString)(startedAt)}`);
            return [];
        }
        finally {
            releaseSemaphore();
        }
    }
    ;
    // Generic data getter for things we want to cache but require custom fetch logic
    //    - maxRecordsConfigKey: optional config key to use to truncate the number of records returned
    async getCacheableToots(key, fetch, maxRecordsConfigKey) {
        const logPrefix = `[API getCacheableToots ${key}]`;
        const releaseMutex = await (0, log_helpers_1.lockMutex)(this.mutexes[key], logPrefix);
        const startedAt = new Date();
        try {
            let toots = await Storage_1.default.getIfNotStale(key);
            if (!toots) {
                const statuses = await fetch();
                console.debug(`${logPrefix} Retrieved ${statuses.length} Status objects ${(0, time_helpers_1.ageString)(startedAt)}`);
                toots = await toot_1.default.buildToots(statuses, logPrefix);
                if (maxRecordsConfigKey) {
                    toots = (0, collection_helpers_1.truncateToConfiguredLength)(toots, maxRecordsConfigKey);
                }
                await Storage_1.default.set(key, toots);
            }
            return toots;
        }
        finally {
            releaseMutex();
        }
    }
    // After the initial load we don't need to have massive concurrency and in fact it can be a big resource
    // drain switching back to the browser window, which triggers a lot of background requests
    setBackgroundConcurrency() {
        const newConcurrency = config_1.Config.maxConcurrentRequestsBackground;
        console.log(`[MastoApi] Setting semaphore to background concurrency to ${newConcurrency}`);
        // TODO: should this call this.requestSemphore.setValue() instead? https://www.npmjs.com/package/async-mutex
        this.requestSemphore = new async_mutex_1.Semaphore(newConcurrency);
    }
    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    async getApiRecords(fetchParams) {
        let logPfx = `[API ${fetchParams.label}]`;
        const useCache = (0, collection_helpers_1.isStorageKey)(fetchParams.label);
        fetchParams.breakIf ??= DEFAULT_BREAK_IF;
        fetchParams.maxRecords ??= config_1.Config.minRecordsForFeatureScoring;
        fetchParams.skipCache ||= !useCache; // Skip cache if label is not a StorageKey
        let { breakIf, fetch, label, maxId, maxRecords, moar, skipCache } = fetchParams;
        if (moar && (skipCache || maxId))
            console.warn(`${logPfx} skipCache=true AND moar or maxId set`);
        (0, log_helpers_1.traceLog)(`${logPfx} fetchData() params:`, fetchParams);
        // Skip mutex if label is not a StorageKey (and so not in the mutexes dictionary)
        // This is for data pulls that are not trying to get at the same data (e.g. running a bunch of searches
        // for different terms vs. trying to get the user's home timeline, which does require a mutex)
        const releaseMutex = useCache ? await (0, log_helpers_1.lockMutex)(this.mutexes[label], logPfx) : null;
        // Trying to put a global semaphore on requests led to thread locks - apparently the searchForToots()
        // requests are grabbing all the semaphores and something important can't get through.
        // const [semaphoreNum, releaseSemaphore] = await lockSemaphore(this.requestSemphore, logPfx);
        // logPfx += ` (semaphore ${semaphoreNum})`;
        const startedAt = new Date();
        let pageNumber = 0;
        let rows = [];
        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedRows = await Storage_1.default.getIfNotStale(label);
                if (cachedRows) {
                    // Return cached data unless moar=true
                    if (!moar)
                        return cachedRows;
                    // IF MOAR!!!! then we want to find the minimum ID in the cached data and do a fetch from that point
                    // TODO: a bit janky of an approach... we could maybe use the min/max_id param in normal request
                    rows = cachedRows;
                    maxRecords = maxRecords + rows.length; // Add another unit of maxRecords to # of rows we have now
                    maxId = (0, collection_helpers_1.findMinId)(rows);
                    console.log(`${logPfx} Found min ID ${maxId} in cache to use as maxId request param`);
                }
                ;
            }
            for await (const page of fetch(this.buildParams(maxId, maxRecords, logPfx))) {
                rows = rows.concat(page);
                pageNumber += 1;
                const recordsSoFar = `have ${rows.length} records so far ${(0, time_helpers_1.ageString)(startedAt)}`;
                if (rows.length >= maxRecords || breakIf(page, rows)) {
                    (0, log_helpers_1.traceLog)(`${logPfx} Completing fetch at page ${pageNumber} ${recordsSoFar}`);
                    break;
                }
                else {
                    (0, log_helpers_1.traceLog)(`${logPfx} Retrieved page ${pageNumber} (${recordsSoFar})`);
                }
            }
            if (!skipCache)
                await Storage_1.default.set(label, rows);
        }
        catch (e) {
            // If the access token was not revoked whatever rows we've retrieved will be returned
            MastoApi.throwIfAccessTokenRevoked(e, `${logPfx} Failed ${(0, time_helpers_1.ageString)(startedAt)}, have ${rows.length} rows`);
        }
        finally {
            releaseMutex?.();
            // releaseSemaphore();
        }
        return rows;
    }
    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    async hashtagTimelineToots(tag, maxRecords) {
        maxRecords = maxRecords || config_1.Config.defaultRecordsPerPage;
        let logPrefix = `[hashtagTimelineToots("#${tag.name}")]`;
        const [semaphoreNum, releaseSemaphore] = await (0, log_helpers_1.lockSemaphore)(this.requestSemphore, logPrefix);
        logPrefix += ` (semaphore ${semaphoreNum})`;
        const startedAt = new Date();
        try {
            const toots = await this.getApiRecords({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                label: logPrefix,
                maxRecords: maxRecords,
            });
            console.debug(`${logPrefix} Retrieved ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
            return toots;
        }
        catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${(0, time_helpers_1.ageString)(startedAt)}`);
            return [];
        }
        finally {
            releaseSemaphore();
        }
    }
    ;
    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    buildParams(maxId, limit, logPfx) {
        limit ||= config_1.Config.defaultRecordsPerPage;
        let params = {
            limit: Math.min(limit, config_1.Config.defaultRecordsPerPage),
        };
        if (maxId)
            params = { ...params, maxId: `${maxId}` };
        if (logPfx)
            (0, log_helpers_1.traceLog)(`${logPfx} Fetching with params:`, params);
        return params;
    }
    ;
    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(e, msg) {
        console.error(`${msg}. Error:`, e);
        if (!(e instanceof Error)) {
            console.warn(`${msg} - Error is not an instance of Error:`, e);
            return;
        }
        if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
            throw e;
        }
    }
}
exports.default = MastoApi;
;
// TODO: get rid of this eventually
const logTrendingTagResults = (logPrefix, searchMethod, toots) => {
    let msg = `${logPrefix} ${(0, change_case_1.capitalCase)(searchMethod)} found ${toots.length} toots`;
    msg += ` (oldest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))}, newest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.mostRecentTootedAt)(toots))}):`;
    console.info(msg);
};
//# sourceMappingURL=api.js.map