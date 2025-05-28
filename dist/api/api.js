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
exports.isRateLimitError = exports.isAccessTokenRevokedError = void 0;
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./objects/account"));
const Storage_1 = __importStar(require("../Storage"));
const toot_1 = __importStar(require("./objects/toot"));
const user_data_1 = __importDefault(require("./user_data"));
const time_helpers_1 = require("../helpers/time_helpers");
const types_1 = require("../types");
const string_helpers_1 = require("../helpers/string_helpers");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const tag_1 = require("./objects/tag");
const mastodon_server_1 = require("./mastodon_server");
const DEFAULT_BREAK_IF = async (pageOfResults, allResults) => undefined;
// Error messages for MastoHttpError
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const RATE_LIMIT_ERROR_MSG = "Too many requests"; // MastoHttpError: Too many requests
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";
;
;
;
class MastoApi {
    static #instance; // Singleton instance of MastoApi
    api;
    homeDomain;
    user;
    userData; // Save UserData in the API object to avoid polling local storage over and over
    mutexes; // Mutexes for blocking singleton requests (e.g. followed accounts)
    requestSemphore = new async_mutex_1.Semaphore(config_1.config.api.maxConcurrentRequestsInitial); // Limit concurrency of search & tag requests
    // URL for tag on the user's homeserver
    tagUrl = (tag) => `${this.endpointURL(mastodon_server_1.TrendingType.TAGS)}/${typeof tag === "string" ? tag : tag.name}`;
    endpointURL = (endpoint) => `https://${this.homeDomain}/${endpoint}`;
    static init(api, user) {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }
        console.log(`[API] Initializing MastoApi instance with user:`, user.acct);
        MastoApi.#instance = new MastoApi(api, user);
    }
    static get instance() {
        if (!MastoApi.#instance)
            throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }
    constructor(api, user) {
        this.api = api;
        this.user = user;
        this.homeDomain = (0, string_helpers_1.extractDomain)(user.url);
        // Initialize mutexes for each StorageKey
        this.mutexes = Object.keys(types_1.CacheKey).reduce((acc, key) => {
            acc[types_1.CacheKey[key]] = new async_mutex_1.Mutex();
            return acc;
        }, {});
    }
    // Get the user's home timeline feed (recent toots from followed accounts and hashtags).
    // TODO: should there be a mutex? Only called by triggerFeedUpdate() which can only run once at a time
    async fetchHomeFeed(params) {
        let { maxId, maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = types_1.CacheKey.HOME_TIMELINE_TOOTS;
        const logPrefix = (0, string_helpers_1.bracketed)(cacheKey);
        const startedAt = new Date();
        let homeTimelineToots = await Storage_1.default.getCoerced(cacheKey);
        let allNewToots = [];
        let cutoffAt = (0, time_helpers_1.timelineCutoffAt)();
        let oldestTootStr = "no oldest toot";
        if (moar) {
            const minMaxId = (0, collection_helpers_1.findMinMaxId)(homeTimelineToots);
            if (minMaxId)
                maxId = minMaxId.min; // Use the min ID in the cache as the maxId for the MOAR request
            console.log(`${logPrefix} Fetching more old toots (found min ID ${maxId})`);
        }
        else {
            // Look back additional lookbackForUpdatesMinutes minutes to catch new updates and edits to toots
            const maxTootedAt = (0, toot_1.mostRecentTootedAt)(homeTimelineToots);
            const lookbackSeconds = config_1.config.api.data[types_1.CacheKey.HOME_TIMELINE_TOOTS]?.lookbackForUpdatesMinutes * 60;
            cutoffAt = maxTootedAt ? (0, time_helpers_1.subtractSeconds)(maxTootedAt, lookbackSeconds) : (0, time_helpers_1.timelineCutoffAt)();
            cutoffAt = (0, time_helpers_1.mostRecent)((0, time_helpers_1.timelineCutoffAt)(), cutoffAt);
            console.debug(`${logPrefix} maxTootedAt: ${(0, time_helpers_1.quotedISOFmt)(maxTootedAt)}, maxId: ${maxId}, cutoffAt: ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)}`);
        }
        // getApiRecords() returns Toots that haven't had completeProperties() called on them
        // which we don't use because breakIf() calls mergeTootsToFeed() on each page of results
        const _incompleteToots = await this.getApiRecords({
            fetch: this.api.v1.timelines.home.list,
            cacheKey: cacheKey,
            maxId: maxId,
            maxRecords: maxRecords,
            skipCache: true,
            skipMutex: true,
            breakIf: async (newStatuses, allStatuses) => {
                const oldestTootAt = (0, toot_1.earliestTootedAt)(newStatuses);
                if (!oldestTootAt) {
                    console.warn(`${logPrefix} No new statuses in page of ${newStatuses.length} toots, halting`);
                    return true;
                }
                oldestTootStr = `oldest toot: ${(0, time_helpers_1.quotedISOFmt)(oldestTootAt)}`;
                console.debug(`${logPrefix} Got ${newStatuses.length} new toots, ${allStatuses.length} total (${oldestTootStr})`);
                const newToots = await toot_1.default.buildToots(newStatuses, cacheKey);
                await mergeTootsToFeed(newToots, logPrefix);
                allNewToots = allNewToots.concat(newToots);
                // Break the toot fetching loop if we encounter a toot older than cutoffAt
                if (oldestTootAt < cutoffAt) {
                    console.log(`${logPrefix} Halting fetch (${oldestTootStr} <= cutoff ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)})`);
                    return true;
                }
            }
        });
        homeTimelineToots = toot_1.default.dedupeToots([...allNewToots, ...homeTimelineToots], cacheKey);
        let msg = `${logPrefix} Fetched ${allNewToots.length} new toots ${(0, time_helpers_1.ageString)(startedAt)} (${oldestTootStr}`;
        console.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        homeTimelineToots = (0, toot_1.sortByCreatedAt)(homeTimelineToots).reverse(); // TODO: should we sort by score?
        homeTimelineToots = (0, collection_helpers_1.truncateToConfiguredLength)(homeTimelineToots, config_1.config.toots.maxTimelineLength, logPrefix);
        await Storage_1.default.set(cacheKey, homeTimelineToots);
        return homeTimelineToots;
    }
    // Get blocked accounts (doesn't include muted accounts)
    async getBlockedAccounts() {
        const blockedAccounts = await this.getApiRecords({
            fetch: this.api.v1.blocks.list,
            cacheKey: types_1.CacheKey.BLOCKED_ACCOUNTS
        });
        account_1.default.logSuspendedAccounts(blockedAccounts, types_1.CacheKey.BLOCKED_ACCOUNTS);
        return blockedAccounts;
    }
    // Generic data getter for things we want to cache but require custom fetch logic
    //    - maxRecordsConfigKey: optional config key to use to truncate the number of records returned
    async getCacheableToots(fetch, key, maxRecords) {
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mutexes[key], key);
        const startedAt = new Date();
        try {
            let toots = await Storage_1.default.getIfNotStale(key);
            if (!toots) {
                const statuses = await fetch();
                (0, log_helpers_1.traceLog)(`${(0, string_helpers_1.bracketed)(key)} Retrieved ${statuses.length} Statuses ${(0, time_helpers_1.ageString)(startedAt)}`);
                toots = await toot_1.default.buildToots(statuses, key);
                toots = (0, collection_helpers_1.truncateToConfiguredLength)(toots, maxRecords, key);
                await Storage_1.default.set(key, toots);
            }
            return toots;
        }
        finally {
            releaseMutex();
        }
    }
    // Get an array of Toots the user has recently favourited: https://docs.joinmastodon.org/methods/favourites/#get
    // IDs of accounts ar enot monotonic so there's not really any way to incrementally load this endpoint
    async getFavouritedToots(params) {
        return await this.getApiRecords({
            fetch: this.api.v1.favourites.list,
            cacheKey: types_1.CacheKey.FAVOURITED_TOOTS,
            ...(params || {})
        });
    }
    // Get accounts the user is following
    async getFollowedAccounts(params) {
        return await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            cacheKey: types_1.CacheKey.FOLLOWED_ACCOUNTS,
            processFxn: (account) => account.isFollowed = true,
            ...(params || {})
        });
    }
    // Get hashtags the user is following
    async getFollowedTags(params) {
        return await this.getApiRecords({
            fetch: this.api.v1.followedTags.list,
            cacheKey: types_1.CacheKey.FOLLOWED_TAGS,
            processFxn: (tag) => (0, tag_1.repairTag)(tag),
            ...(params || {})
        });
    }
    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts(params) {
        const mutedAccounts = await this.getApiRecords({
            fetch: this.api.v1.mutes.list,
            cacheKey: types_1.CacheKey.MUTED_ACCOUNTS,
            ...(params || {})
        });
        account_1.default.logSuspendedAccounts(mutedAccounts, types_1.CacheKey.MUTED_ACCOUNTS);
        return mutedAccounts.concat(await this.getBlockedAccounts());
    }
    // Get the user's recent notifications
    async getNotifications(params) {
        return await this.getApiRecords({
            fetch: this.api.v1.notifications.list,
            cacheKey: types_1.CacheKey.NOTIFICATIONS,
            ...(params || {})
        });
    }
    // Get the user's recent toots
    // NOTE: the user's own Toots don't have completeProperties() called on them!
    async getRecentUserToots(params) {
        return await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            cacheKey: types_1.CacheKey.RECENT_USER_TOOTS,
            ...(params || {})
        });
    }
    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.getApiRecords() doesn't work here because endpoint doesn't paginate the same way
    async getServerSideFilters() {
        const logPrefix = (0, string_helpers_1.bracketed)(types_1.CacheKey.SERVER_SIDE_FILTERS);
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mutexes[types_1.CacheKey.SERVER_SIDE_FILTERS], logPrefix);
        const startTime = new Date();
        try {
            let filters = await Storage_1.default.getIfNotStale(types_1.CacheKey.SERVER_SIDE_FILTERS);
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
                await Storage_1.default.set(types_1.CacheKey.SERVER_SIDE_FILTERS, filters);
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
        numToots ||= config_1.config.trending.tags.numTootsPerTag;
        const startedAt = new Date();
        const tagToots = await Promise.all([
            this.searchForToots(tag.name, numToots),
            this.hashtagTimelineToots(tag, numToots),
        ]);
        logTrendingTagResults(`[getStatusesForTag(#${tag.name})]`, "both hashtag searches", tagToots.flat(), startedAt);
        return tagToots.flat();
    }
    // Collect and fully populate / dedup a collection of toots for an array of Tags
    async getStatusesForTags(tags, numTootsPerTag) {
        console.log(`[getStatusesForTags()] called for ${tags.length} tags:`, tags.map(t => t.name));
        const tagToots = await Promise.all(tags.map(tag => this.getStatusesForTag(tag, numTootsPerTag)));
        return tagToots.flat();
    }
    // Retrieve background data about the user that will be used for scoring etc.
    // Caches as an instance variable so the storage doesn't have to be hit over and over
    async getUserData() {
        // TODO: the staleness check probably belongs in the UserData class
        if (!this.userData || (await this.userData.isDataStale())) {
            this.userData = await user_data_1.default.build();
        }
        return this.userData;
    }
    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    async hashtagTimelineToots(tag, maxRecords) {
        maxRecords = maxRecords || config_1.config.api.defaultRecordsPerPage;
        const logPrefix = `[hashtagTimelineToots("#${tag.name}")]`;
        const releaseSemaphore = await (0, log_helpers_1.lockExecution)(this.requestSemphore, logPrefix);
        const startedAt = new Date();
        try {
            const toots = await this.getApiRecords({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                cacheKey: types_1.CacheKey.HASHTAG_TOOTS,
                maxRecords: maxRecords,
                skipCache: true,
                skipMutex: true,
            });
            (0, log_helpers_1.traceLog)(`${logPrefix} Retrieved ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
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
    // Retrieve the user's home instance configuration from the API
    async instanceInfo() {
        try {
            return await this.api.v2.instance.fetch();
        }
        catch (err) {
            console.error(`[MastoApi] Failed to fetch user's instance info, trying V1 API:`, err);
            return await this.api.v1.instance.fetch();
        }
    }
    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot) {
        const logPrefix = `[API resolveToot()]`;
        const tootURI = toot.realURI();
        const urlDomain = (0, string_helpers_1.extractDomain)(tootURI);
        (0, log_helpers_1.traceLog)(`${logPrefix} called for`, toot);
        if (urlDomain == this.homeDomain)
            return toot;
        const lookupResult = await this.api.v2.search.list({ q: tootURI, resolve: true });
        if (!lookupResult?.statuses?.length) {
            (0, log_helpers_1.logAndThrowError)(`${logPrefix} got bad result for "${tootURI}"`, lookupResult);
        }
        const resolvedStatus = lookupResult.statuses[0];
        (0, log_helpers_1.traceLog)(`${logPrefix} found resolvedStatus for "${tootURI}":`, resolvedStatus);
        return toot_1.default.build(resolvedStatus);
    }
    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr, maxRecords) {
        maxRecords = maxRecords || config_1.config.api.defaultRecordsPerPage;
        let logPrefix = `[API searchForToots("${searchStr}")]`;
        const releaseSemaphore = await (0, log_helpers_1.lockExecution)(this.requestSemphore, logPrefix);
        const query = { limit: maxRecords, q: searchStr, type: mastodon_server_1.TrendingType.STATUSES };
        logPrefix += ` (semaphore)`;
        const startedAt = new Date();
        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            (0, log_helpers_1.traceLog)(`${logPrefix} Retrieved ${statuses.length} ${(0, time_helpers_1.ageString)(startedAt)}`);
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
    // After the initial load we don't need to have massive concurrency and in fact it can be a big resource
    // drain switching back to the browser window, which triggers a lot of background requests
    // TODO: should this call this.requestSemphore.setValue() instead? https://www.npmjs.com/package/async-mutex
    setSemaphoreConcurrency(concurrency) {
        console.log(`[MastoApi] Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new async_mutex_1.Semaphore(concurrency);
    }
    /////////////////////////////
    //     Private Methods     //
    /////////////////////////////
    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    async getApiRecords(params) {
        let { breakIf, cacheKey, fetch, maxId, maxRecords, moar, processFxn, skipCache, skipMutex } = params;
        let logPfx = `${(0, string_helpers_1.bracketed)(cacheKey)}`;
        if (moar && (skipCache || maxId))
            console.warn(`${logPfx} skipCache=true AND moar or maxId set`);
        // Parse params and set defaults
        const requestDefaults = config_1.config.api.data[cacheKey];
        maxRecords ??= requestDefaults?.initialMaxRecords ?? config_1.MIN_RECORDS_FOR_FEATURE_SCORING;
        const limit = Math.min(maxRecords, requestDefaults?.limit || config_1.config.api.defaultRecordsPerPage); // max records per page
        breakIf ??= DEFAULT_BREAK_IF;
        let minId; // Used for incremental loading when data is stale (if supported)
        // Skip mutex for requests that aren't trying to get at the same data
        const releaseMutex = skipMutex ? null : await (0, log_helpers_1.lockExecution)(this.mutexes[cacheKey], logPfx);
        const startedAt = new Date();
        let pageNumber = 0;
        let rows = [];
        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedData = await Storage_1.default.getWithStaleness(cacheKey);
                if (cachedData?.obj) {
                    // Return the cachedRows if they exist, the data is not stale, and moar is false
                    const cachedRows = cachedData.obj;
                    if (!cachedData.isStale && !moar)
                        return cachedRows;
                    const minMaxId = (0, collection_helpers_1.findMinMaxId)(cachedRows);
                    if (moar) {
                        maxRecords = maxRecords + cachedRows.length; // Add another unit of maxRecords to the rows we have now
                    }
                    // If maxId is supported then we find the minimum ID in the cached data use it as the next maxId.
                    if (requestDefaults?.supportsMinMaxId && minMaxId) {
                        rows = cachedRows;
                        // If we're pulling "moar" old data, use the min ID of the cache as the request maxId
                        // If we're incrementally updating stale data, use the max ID of the cache as the request minId
                        if (moar) {
                            maxId = minMaxId.min;
                            console.debug(`${logPfx} Getting MOAR old data; loading backwards from maxId ${maxId}`);
                        }
                        else {
                            minId = minMaxId.max;
                            console.debug(`${logPfx} Stale data; attempting incremental load from minId ${minId}`);
                        }
                    }
                    else {
                        // If maxId isn't supported then we don't start with the cached data in the 'rows' array
                        let msg = `${logPfx} maxId not supported or no cache, ${cachedRows.length} records, minMaxId:`;
                        console.debug(msg, minMaxId, `, maxRecords=${maxRecords}\nrequestDefaults:`, requestDefaults);
                    }
                }
                ;
            }
            (0, log_helpers_1.traceLog)(`${logPfx} fetchData() params w/defaults:`, { ...params, limit, minId, maxId, maxRecords });
            for await (const page of fetch(this.buildParams(limit, minId, maxId))) {
                rows = rows.concat(page);
                pageNumber += 1;
                const shouldStop = await breakIf(page, rows); // Must be called before we check the length of rows!
                const recordsSoFar = `${page.length} in page, ${rows.length} records so far ${(0, time_helpers_1.ageString)(startedAt)}`;
                if (rows.length >= maxRecords || page.length == 0 || shouldStop) {
                    console.debug(`${logPfx} Completing fetch at page ${pageNumber}, ${recordsSoFar}, shouldStop=${shouldStop}`);
                    break;
                }
                else {
                    const msg = `${logPfx} Retrieved page ${pageNumber} (${recordsSoFar})`;
                    (pageNumber % 5 == 0) ? console.debug(msg) : (0, log_helpers_1.traceLog)(msg);
                }
            }
        }
        catch (e) {
            // TODO: handle rate limiting errors
            // If the access token was not revoked whatever rows we've retrieved will be returned
            MastoApi.throwIfAccessTokenRevoked(e, `${logPfx} Failed ${(0, time_helpers_1.ageString)(startedAt)}, have ${rows.length} rows`);
        }
        finally {
            releaseMutex?.();
        }
        const objs = this.buildFromApiObjects(cacheKey, rows);
        if (processFxn)
            objs.forEach(obj => obj && processFxn(obj));
        if (!skipCache)
            await Storage_1.default.set(cacheKey, objs);
        return objs;
    }
    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    buildParams(limit, minId, maxId) {
        let params = { limit: limit };
        if (minId)
            params = { ...params, minId: `${minId}` };
        if (maxId)
            params = { ...params, maxId: `${maxId}` };
        // if (logPfx) traceLog(`${logPfx} Fetching with params:`, params);
        return params;
    }
    // Construct an Account or Toot object from the API object (otherwise just return the object)
    buildFromApiObjects(key, objects) {
        if (Storage_1.STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            return objects.map(o => account_1.default.build(o)); // TODO: dedupe accounts?
        }
        else if (Storage_1.STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            const toots = objects.map(obj => obj instanceof toot_1.default ? obj : toot_1.default.build(obj));
            return toot_1.default.dedupeToots(toots, `${key} buildFromApiObjects`);
        }
        else {
            return objects;
        }
    }
    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////
    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(error, msg) {
        console.error(`${msg}. Error:`, error);
        if (isAccessTokenRevokedError(error))
            throw error;
    }
    // Throw just a simple string as the error if it's a rate limit error; otherwise re-raise
    static throwSanitizedRateLimitError(error, msg) {
        if (isRateLimitError(error)) {
            console.error(`Rate limit error:`, error);
            throw RATE_LIMIT_USER_WARNING;
        }
        else {
            (0, log_helpers_1.logAndThrowError)(msg, error);
        }
    }
}
exports.default = MastoApi;
;
// Return true if the error is an access token revoked error
function isAccessTokenRevokedError(e) {
    if (!(e instanceof Error)) {
        console.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }
    return e.message.includes(ACCESS_TOKEN_REVOKED_MSG);
}
exports.isAccessTokenRevokedError = isAccessTokenRevokedError;
;
// Return true if the error is an access token revoked error
function isRateLimitError(e) {
    if (!(e instanceof Error)) {
        console.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }
    return e.message.includes(RATE_LIMIT_ERROR_MSG);
}
exports.isRateLimitError = isRateLimitError;
;
// TODO: get rid of this eventually
const logTrendingTagResults = (logPrefix, searchMethod, toots, startedAt) => {
    let msg = `${logPrefix} ${searchMethod} found ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`;
    msg += ` (oldest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))}, newest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.mostRecentTootedAt)(toots))}):`;
    console.debug(msg);
};
//# sourceMappingURL=api.js.map