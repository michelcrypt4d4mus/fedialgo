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
const toot_1 = __importStar(require("./objects/toot"));
const user_data_1 = __importDefault(require("./user_data"));
const Storage_1 = __importStar(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
const enums_1 = require("../enums");
const config_1 = require("../config");
const string_helpers_1 = require("../helpers/string_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const logger_1 = require("../helpers/logger");
const tag_1 = require("./objects/tag");
const enums_2 = require("../enums");
const collection_helpers_1 = require("../helpers/collection_helpers");
;
;
;
;
;
;
;
;
// constants
const ALL_CACHE_KEYS = [...Object.values(enums_1.CacheKey), ...Object.values(enums_1.TagTootsCacheKey)];
// Error messages for MastoHttpError
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const RATE_LIMIT_ERROR_MSG = "Too many requests"; // MastoHttpError: Too many requests
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";
// Logging
const LOG_PREFIX = 'API';
const PARAMS_TO_NOT_LOG = ["breakIf", "fetch", "logger", "processFxn"];
const PARAMS_TO_NOT_LOG_IF_FALSE = ["skipCache", "skipMutex", "moar"];
// Loggers prefixed by [API]
const getLogger = logger_1.Logger.logBuilder(LOG_PREFIX);
const apiLogger = getLogger();
class MastoApi {
    static #instance; // Singleton instance of MastoApi
    api;
    apiErrors = []; // Errors encountered while using the API
    homeDomain;
    logger;
    user;
    userData; // Save UserData in the API object to avoid polling local storage over and over
    waitTimes = {}; // Just for measuring performance (poorly)
    mutexes; // Mutexes for blocking singleton requests (e.g. followed accounts)
    requestSemphore = new async_mutex_1.Semaphore(config_1.config.api.maxConcurrentHashtagRequests); // Limit concurrency of search & hashtag requests
    static init(api, user) {
        if (MastoApi.#instance) {
            apiLogger.warn(`MastoApi instance already initialized...`);
            return;
        }
        apiLogger.log(`Initializing MastoApi instance with user:`, user.acct);
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
        this.logger = getLogger();
        this.reset();
        // Initialize mutexes for each StorageKey
        this.mutexes = ALL_CACHE_KEYS.reduce((mutexes, key) => {
            mutexes[key] = new async_mutex_1.Mutex();
            return mutexes;
        }, {});
    }
    // Get the user's home timeline feed (recent toots from followed accounts and hashtags).
    // TODO: should there be a mutex? Only called by triggerFeedUpdate() which can only run once at a time
    async fetchHomeFeed(params) {
        let { maxId, maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = enums_1.CacheKey.HOME_TIMELINE_TOOTS;
        const logger = getLogger(...[cacheKey].concat(moar ? ["moar"] : []));
        const startedAt = new Date();
        let homeTimelineToots = await Storage_1.default.getCoerced(cacheKey);
        let allNewToots = [];
        let cutoffAt = (0, time_helpers_1.timelineCutoffAt)();
        let oldestTootStr = "no oldest toot";
        if (moar) {
            const minMaxId = (0, collection_helpers_1.findMinMaxId)(homeTimelineToots);
            if (minMaxId)
                maxId = minMaxId.min; // Use the min ID in the cache as the maxId for the MOAR request
            logger.log(`Fetching more old toots (found min ID ${maxId})`);
        }
        else {
            // Look back additional lookbackForUpdatesMinutes minutes to catch new updates and edits to toots
            const maxTootedAt = (0, toot_1.mostRecentTootedAt)(homeTimelineToots);
            const lookbackSeconds = config_1.config.api.data[cacheKey]?.lookbackForUpdatesMinutes * 60;
            cutoffAt = maxTootedAt ? (0, time_helpers_1.subtractSeconds)(maxTootedAt, lookbackSeconds) : (0, time_helpers_1.timelineCutoffAt)();
            cutoffAt = (0, time_helpers_1.mostRecent)((0, time_helpers_1.timelineCutoffAt)(), cutoffAt);
            logger.debug(`maxTootedAt: ${(0, time_helpers_1.quotedISOFmt)(maxTootedAt)}, maxId: ${maxId}, cutoffAt: ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)}`);
        }
        // getApiRecords() returns Toots that haven't had completeProperties() called on them
        // which we don't use because breakIf() calls mergeTootsToFeed() on each page of results
        const _incompleteToots = await this.getApiRecords({
            fetch: this.api.v1.timelines.home.list,
            cacheKey: cacheKey,
            logger,
            maxId: maxId,
            maxRecords: maxRecords,
            skipCache: true,
            skipMutex: true,
            breakIf: async (newStatuses, allStatuses) => {
                const oldestTootAt = (0, toot_1.earliestTootedAt)(newStatuses);
                if (!oldestTootAt) {
                    logger.warn(`No new statuses in page of ${newStatuses.length} toots, halting`);
                    return true;
                }
                oldestTootStr = `oldest toot: ${(0, time_helpers_1.quotedISOFmt)(oldestTootAt)}`;
                logger.debug(`Got ${newStatuses.length} new toots, ${allStatuses.length} total (${oldestTootStr})`);
                const newToots = await toot_1.default.buildToots(newStatuses, cacheKey);
                await mergeTootsToFeed(newToots, logger);
                allNewToots = allNewToots.concat(newToots);
                // Break the toot fetching loop if we encounter a toot older than cutoffAt
                if (oldestTootAt < cutoffAt) {
                    logger.log(`Halting fetch (${oldestTootStr} <= cutoff ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)})`);
                    return true;
                }
            }
        });
        homeTimelineToots = toot_1.default.dedupeToots([...allNewToots, ...homeTimelineToots], logger);
        let msg = `Fetched ${allNewToots.length} new toots ${(0, time_helpers_1.ageString)(startedAt)} (${oldestTootStr}`;
        logger.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        homeTimelineToots = (0, toot_1.sortByCreatedAt)(homeTimelineToots).reverse(); // TODO: should we sort by score?
        homeTimelineToots = (0, collection_helpers_1.truncateToConfiguredLength)(homeTimelineToots, config_1.config.toots.maxTimelineLength, logger);
        await Storage_1.default.set(cacheKey, homeTimelineToots);
        return homeTimelineToots;
    }
    // Get blocked accounts (doesn't include muted accounts)
    async getBlockedAccounts() {
        const blockedAccounts = await this.getApiRecords({
            fetch: this.api.v1.blocks.list,
            cacheKey: enums_1.CacheKey.BLOCKED_ACCOUNTS
        });
        account_1.default.logSuspendedAccounts(blockedAccounts, enums_1.CacheKey.BLOCKED_ACCOUNTS);
        return blockedAccounts;
    }
    // Generic data getter for things we want to cache but require custom fetch logic.
    // Currently used for the variou hashtag feeds (participated, trending, favourited).
    async getCacheableToots(fetchStatuses, cacheKey, maxRecords) {
        const logger = getLogger(cacheKey);
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mutexes[cacheKey], logger);
        const startedAt = new Date();
        try {
            let toots = await Storage_1.default.getIfNotStale(cacheKey);
            if (!toots) {
                const statuses = await fetchStatuses();
                logger.trace(`Retrieved ${statuses.length} Statuses ${(0, time_helpers_1.ageString)(startedAt)}`);
                toots = await toot_1.default.buildToots(statuses, cacheKey);
                toots = (0, collection_helpers_1.truncateToConfiguredLength)(toots, maxRecords, logger);
                await Storage_1.default.set(cacheKey, toots);
            }
            return toots;
        }
        catch (err) {
            // TODO: the hacky cast is because ApiCacheKey is broader than CacheKey
            this.handleApiError({ cacheKey: cacheKey, logger }, [], startedAt, err);
            return [];
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
            cacheKey: enums_1.CacheKey.FAVOURITED_TOOTS,
            ...(params || {})
        });
    }
    // Get accounts the user is following
    async getFollowedAccounts(params) {
        return await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            cacheKey: enums_1.CacheKey.FOLLOWED_ACCOUNTS,
            processFxn: (account) => account.isFollowed = true,
            ...(params || {})
        });
    }
    // Get hashtags the user is following
    async getFollowedTags(params) {
        return await this.getApiRecords({
            fetch: this.api.v1.followedTags.list,
            cacheKey: enums_1.CacheKey.FOLLOWED_TAGS,
            processFxn: (tag) => (0, tag_1.repairTag)(tag),
            ...(params || {})
        });
    }
    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts(params) {
        const mutedAccounts = await this.getApiRecords({
            fetch: this.api.v1.mutes.list,
            cacheKey: enums_1.CacheKey.MUTED_ACCOUNTS,
            ...(params || {})
        });
        account_1.default.logSuspendedAccounts(mutedAccounts, enums_1.CacheKey.MUTED_ACCOUNTS);
        return mutedAccounts.concat(await this.getBlockedAccounts());
    }
    // Get the user's recent notifications
    async getNotifications(params) {
        const notifs = await this.getApiRecords({
            fetch: this.api.v1.notifications.list,
            cacheKey: enums_1.CacheKey.NOTIFICATIONS,
            ...(params || {})
        });
        this.logger.log(`[${enums_1.CacheKey.NOTIFICATIONS}] getNotifications() retrieved ${notifs.length} notifications:`);
        return notifs;
    }
    // Get the user's recent toots
    // NOTE: the user's own Toots don't have completeProperties() called on them!
    async getRecentUserToots(params) {
        return await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            cacheKey: enums_1.CacheKey.RECENT_USER_TOOTS,
            ...(params || {})
        });
    }
    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.getApiRecords() doesn't work here because endpoint doesn't paginate the same way
    async getServerSideFilters() {
        const logger = getLogger(enums_1.CacheKey.SERVER_SIDE_FILTERS);
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mutexes[enums_1.CacheKey.SERVER_SIDE_FILTERS], logger);
        const startTime = new Date();
        try {
            let filters = await Storage_1.default.getIfNotStale(enums_1.CacheKey.SERVER_SIDE_FILTERS);
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
                logger.log(`Retrieved ${filters.length} filters ${(0, time_helpers_1.ageString)(startTime)}:`, filters);
                await Storage_1.default.set(enums_1.CacheKey.SERVER_SIDE_FILTERS, filters);
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
    async getStatusesForTag(tagName, logger, numToots) {
        numToots ||= config_1.config.trending.tags.numTootsPerTag;
        const startedAt = new Date();
        const results = await (0, collection_helpers_1.getPromiseResults)([
            this.searchForToots(tagName, logger.tempLogger('search'), numToots),
            this.hashtagTimelineToots(tagName, logger.tempLogger('timeline'), numToots),
        ]);
        if (results.rejectedReasons.length) {
            const accessRevokedError = results.rejectedReasons.find(e => isAccessTokenRevokedError(e));
            if (accessRevokedError) {
                throw accessRevokedError;
            }
            else {
                this.apiErrors.push(new Error(`Error getting toots for "#${tagName}"`, { cause: results.rejectedReasons }));
            }
        }
        const toots = results.fulfilled.flat();
        let msg = `search endpoint got ${results.fulfilled[0].length} toots, hashtag timeline got ${results.fulfilled[1].length}`;
        msg += ` ${(0, time_helpers_1.ageString)(startedAt)} (total ${toots.length}, oldest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))}`;
        logger.trace(`${msg}, newest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.mostRecentTootedAt)(toots))})`);
        return toots;
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
    // Concurrency is managed by a semaphore in this method, not the normal mutexes.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could maybe use the min_id param to avoid redundancy and extra work reprocessing the same toots
    async hashtagTimelineToots(tagName, logger, maxRecords) {
        maxRecords = maxRecords || config_1.config.api.defaultRecordsPerPage;
        const releaseSemaphore = await (0, log_helpers_1.lockExecution)(this.requestSemphore, logger);
        const startedAt = new Date();
        try {
            const toots = await this.getApiRecords({
                fetch: this.api.v1.timelines.tag.$select(tagName).list,
                cacheKey: enums_1.CacheKey.HASHTAG_TOOTS,
                logger,
                maxRecords,
                // hashtag timeline toots are not cached as a group, they're pulled in small amounts and used
                // to create other sets of toots from a lot of small requests, e.g. PARTICIPATED_TAG_TOOTS
                skipCache: true,
                // Concurrency is managed by the semaphore above, not the mutexes
                skipMutex: true,
            });
            logger.trace(`Retrieved ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
            return toots;
        }
        catch (e) {
            MastoApi.throwIfAccessTokenRevoked(logger, e, `Failed ${(0, time_helpers_1.ageString)(startedAt)}`);
            throw (e);
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
            this.logger.error(`<instanceInfo()> Failed to fetch user's instance info, trying V1 API:`, err);
            const v1Instance = await this.api.v1.instance.fetch();
            if (v1Instance) {
                let msg = `V2 instanceInfo() not available but v1 instance info exists. Unfortunately I will now discard it.`;
                this.logger.logAndThrowError(msg, v1Instance);
            }
            else {
                this.logger.logAndThrowError(`Failed to fetch Mastodon instance info from both V1 and V2 APIs`, err);
            }
        }
    }
    async lockAllMutexes() {
        apiLogger.log(`lockAllMutexes() called, locking all mutexes...`);
        return await Promise.all(Object.values(this.mutexes).map(mutex => (0, log_helpers_1.lockExecution)(mutex, apiLogger, 'lockAllMutexes()')));
    }
    ;
    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot) {
        const logger = getLogger('resolveToot()', toot.realURI());
        logger.trace(`called for`, toot);
        const tootURI = toot.realURI();
        const urlDomain = (0, string_helpers_1.extractDomain)(tootURI);
        if (urlDomain == this.homeDomain)
            return toot;
        const lookupResult = await this.api.v2.search.list({ q: tootURI, resolve: true });
        if (!lookupResult?.statuses?.length) {
            logger.logAndThrowError(`Got bad result for "${tootURI}"`, lookupResult);
        }
        const resolvedStatus = lookupResult.statuses[0];
        logger.trace(`found resolvedStatus for "${tootURI}":`, resolvedStatus);
        return toot_1.default.build(resolvedStatus);
    }
    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr, logger, maxRecords) {
        maxRecords = maxRecords || config_1.config.api.defaultRecordsPerPage;
        const releaseSemaphore = await (0, log_helpers_1.lockExecution)(this.requestSemphore, logger);
        const query = { limit: maxRecords, q: searchStr, type: enums_2.TrendingType.STATUSES };
        const startedAt = new Date();
        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            logger.trace(`Retrieved ${statuses.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
            return statuses;
        }
        catch (e) {
            MastoApi.throwIfAccessTokenRevoked(logger, e, `Failed ${(0, time_helpers_1.ageString)(startedAt)}`);
            throw (e);
        }
        finally {
            releaseSemaphore();
        }
    }
    // Called on instantiation and also when we are trying to reset state of the world
    reset() {
        if (this.mutexes)
            this.logger.log(`Resetting MastoApi instance...`);
        this.apiErrors = [];
        this.userData = undefined; // Clear the user data cache
        this.setSemaphoreConcurrency(config_1.config.api.maxConcurrentHashtagRequests);
        this.waitTimes = ALL_CACHE_KEYS.reduce((waitTimes, key) => {
            waitTimes[key] = new log_helpers_1.WaitTime();
            return waitTimes;
        }, {});
    }
    ;
    // After the initial load we don't need to have massive concurrency and in fact it can be a big resource
    // drain switching back to the browser window, which triggers a lot of background requests
    // TODO: should this call this.requestSemphore.setValue() instead? https://www.npmjs.com/package/async-mutex
    setSemaphoreConcurrency(concurrency) {
        this.logger.log(`Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new async_mutex_1.Semaphore(concurrency);
    }
    // URL for tag on the user's homeserver
    tagUrl(tag) {
        return `${this.endpointURL(enums_2.TrendingType.TAGS)}/${typeof tag == "string" ? tag : tag.name}`;
    }
    /////////////////////////////
    //     Private Methods     //
    /////////////////////////////
    // URL for a given API endpoint on this user's home server
    endpointURL = (endpoint) => `https://${this.homeDomain}/${endpoint}`;
    // Check the config for supportsMinMaxId boolean
    supportsMinMaxId = (cacheKey) => !!config_1.config.api.data[cacheKey]?.supportsMinMaxId;
    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    async getApiRecords(inParams) {
        let { breakIf, cacheKey, fetch, logger, moar, processFxn, skipCache, skipMutex } = inParams;
        logger ??= getLogger(cacheKey, 'getApiRecords');
        // Lock mutex before checking cache (unless skipMutex is true)
        const releaseMutex = skipMutex ? null : await (0, log_helpers_1.lockExecution)(this.mutexes[cacheKey], logger);
        const completeParams = await this.addCacheDataToParams({ ...inParams, logger });
        let { cacheResult, maxCacheRecords, maxRecords } = completeParams;
        // If cache is fresh return it unless 'moar' flag is set (Storage.get() handled the deserialization of Toots etc.)
        if (this.shouldReturnCachedRows(completeParams)) {
            releaseMutex?.(); // TODO: seems a bit dangerous to handle the mutex outside of try/finally...
            return cacheResult.rows;
        }
        let cachedRows = cacheResult?.rows || [];
        let pageNumber = 0;
        let newRows = [];
        try {
            // Telemetry stuff that should be removed eventually
            this.waitTimes[cacheKey] ||= new log_helpers_1.WaitTime();
            this.waitTimes[cacheKey].markStart();
            for await (const page of fetch(this.buildParams(completeParams))) {
                this.waitTimes[cacheKey].markEnd(); // telemetry
                const requestSeconds = this.waitTimes[cacheKey].ageInSeconds() || 0;
                // the important stuff
                newRows = newRows.concat(page);
                pageNumber += 1;
                const shouldStop = breakIf ? (await breakIf(page, newRows)) : false; // breakIf() must be called before we check the length of rows!
                const recordsSoFar = `${page.length} in page, ${newRows.length} records so far ${this.waitTimes[cacheKey].ageString()}`;
                if (newRows.length >= maxRecords || page.length == 0 || shouldStop) {
                    logger.debug(`Completing fetch at page ${pageNumber}, ${recordsSoFar}, shouldStop=${shouldStop}`);
                    break;
                }
                else if (requestSeconds > config_1.config.api.maxSecondsPerPage) {
                    throw new Error(`Stopped fetch at page ${pageNumber}, ${recordsSoFar}. Took too long (${requestSeconds}s)`);
                }
                else {
                    const msg = `Retrieved page ${pageNumber} (${recordsSoFar})`;
                    (pageNumber % 5 == 0) ? logger.debug(msg) : logger.trace(msg);
                }
                // Reset timer to try to only measure the time spent waiting for the API to respond
                this.waitTimes[cacheKey].markStart();
            }
        }
        catch (e) {
            if (!this.waitTimes[cacheKey]) {
                logger.warn(`waitTimes[${cacheKey}] is undefined!`);
                this.waitTimes[cacheKey] = new log_helpers_1.WaitTime();
                this.waitTimes[cacheKey].markStart();
            }
            newRows = this.handleApiError(completeParams, newRows, this.waitTimes[cacheKey].startedAt, e);
            cachedRows = []; // Set cachedRows to empty because hanldeApiError() already handled the merge
        }
        finally {
            releaseMutex?.();
        }
        // If endpoint has unique IDs (e.g. Toots) then we merge the cached rows with the new ones
        // (they will be deduped in buildFromApiObjects() if needed)
        if (Storage_1.STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
            newRows = [...cachedRows, ...newRows];
        }
        // If we have a maxCacheRecords limit, truncate the new rows to that limit
        if (maxCacheRecords && newRows.length > maxCacheRecords) {
            try {
                logger.warn(`Truncating ${newRows.length} rows to maxCacheRecords=${maxCacheRecords}`);
                newRows = (0, collection_helpers_1.truncateToConfiguredLength)((0, collection_helpers_1.sortObjsByCreatedAt)(newRows), maxCacheRecords, logger);
            }
            catch (err) {
                logger.error(`Error truncating new rows to maxCacheRecords=${maxCacheRecords}`, err);
            }
        }
        const objs = this.buildFromApiObjects(cacheKey, newRows, logger);
        if (processFxn)
            objs.forEach(obj => obj && processFxn(obj));
        if (!skipCache)
            await Storage_1.default.set(cacheKey, objs);
        return objs;
    }
    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    buildParams(params) {
        const { limit, minIdForFetch, maxIdForFetch } = params;
        let apiParams = { limit };
        if (minIdForFetch)
            apiParams = { ...apiParams, minId: `${minIdForFetch}` };
        if (maxIdForFetch)
            apiParams = { ...apiParams, maxId: `${maxIdForFetch}` };
        return apiParams;
    }
    // Fill in defaults in params and derive the min/maxIdForFetch from cached data if appropriate
    async addCacheDataToParams(params) {
        let { cacheKey, logger, maxId, moar, skipCache } = params;
        logger ??= getLogger(cacheKey, moar ? "moar" : "initial");
        const fullParams = fillInDefaultParams({ ...params, logger });
        const { maxRecords } = fullParams;
        // Fetch from cache unless skipCache is true
        const cacheResult = skipCache ? null : (await this.getCachedRows(cacheKey));
        const minMaxIdParams = { maxIdForFetch: null, minIdForFetch: null };
        // If min/maxId is supported then we find the min/max ID in the cached data to use in the next request
        // If we're pulling "moar" old data, use the min ID of the cache as the request maxId
        // If we're incrementally updating stale data, use the max ID of the cache as the request minId
        if (cacheResult?.minMaxId) {
            if (moar) {
                if (maxId) {
                    logger.warn(`maxId param "${maxId}" will overload minID in cache "${cacheResult.minMaxId.min}"!`);
                }
                minMaxIdParams.maxIdForFetch = maxId || cacheResult.minMaxId.min;
                logger.info(`Getting MOAR_DATA; loading backwards from minId in cache: "${minMaxIdParams.maxIdForFetch}"`);
            }
            else {
                // TODO: is this right? we used to return the cached data quickly if it was OK...
                // TODO: at the very least we are filling in this value when it is only used for updating stale data...
                minMaxIdParams.minIdForFetch = cacheResult.minMaxId.max;
                if (cacheResult.isStale) {
                    logger.info(`Incremental update of stale data from cached maxId "${minMaxIdParams.minIdForFetch}"`);
                }
            }
        }
        else if (maxId) {
            logger.info(`Loading backward from manually provided maxId: "${maxId}"`);
            minMaxIdParams.maxIdForFetch = maxId; // If we have a manually provided maxId use it as the maxIdForFetch
        }
        // If 'moar' flag is set, add another unit of maxRecords to the row count we have now
        if (cacheResult && moar) {
            const newMaxRecords = maxRecords + cacheResult.rows.length;
            logger.info(`Increasing maxRecords for MOAR_DATA to ${newMaxRecords}`);
        }
        const completedParams = {
            ...minMaxIdParams,
            ...fullParams,
            cacheResult,
            maxRecords
        };
        this.validateFetchParams(completedParams);
        return completedParams;
    }
    // Load data from the cache and make some inferences. Thin wrapper around Storage.getWithStaleness()
    async getCachedRows(key) {
        const cachedData = await Storage_1.default.getWithStaleness(key);
        if (!cachedData)
            return null;
        const rows = cachedData?.obj;
        // NOTE: Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
        // or future. For a while we used a small offset to the list of toots sorted by created_at instead
        // of the actual min/max.
        return {
            isStale: cachedData.isStale,
            // minMaxId is not returned  if endpoint doesn't support min/max ID API requests (even if it exists)
            minMaxId: this.supportsMinMaxId(key) ? (0, collection_helpers_1.findMinMaxId)(rows) : null,
            rows,
            updatedAt: cachedData.updatedAt,
        };
    }
    // If the access token was not revoked we need to decide which of the rows we have to keep.
    // handleApiError() will make a decision about whether to use the cache, the new rows, or both
    // and return the appropriate rows and return the appropriate rows in a single array.
    // TODO: handle rate limiting errors
    handleApiError(params, rows, startedAt, err) {
        let { cacheKey, cacheResult, logger } = params;
        cacheKey ??= enums_1.CacheKey.HOME_TIMELINE_TOOTS; // TODO: this is a hack to avoid undefined cacheKey
        logger ??= getLogger(cacheKey, 'handleApiError');
        const cachedRows = cacheResult?.rows || [];
        let msg = `"${err} After pulling ${rows.length} rows (cache: ${cachedRows.length} rows).`;
        this.apiErrors.push(new Error(logger.str(msg), { cause: err }));
        MastoApi.throwIfAccessTokenRevoked(logger, err, `Failed ${(0, time_helpers_1.ageString)(startedAt)}. ${msg}`);
        // If endpoint doesn't support min/max ID and we have less rows than we started with use old rows
        if (Storage_1.STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
            logger.warn(`${msg} Merging cached rows with new rows based on ID`);
            return [...cachedRows, ...rows];
        }
        else if (!cacheResult?.minMaxId) {
            msg += ` Query didn't use incremental min/max ID.`;
            if (rows.length < cachedRows.length) {
                logger.warn(`${msg} Discarding new rows and returning old ones bc there's more of them.`);
                return cachedRows;
            }
            else {
                logger.warn(`${msg} Keeping the new rows, discarding cached rows bc there's fewer of them.`);
                return rows;
            }
        }
        else {
            logger.error(`Shouldn't be here! All endpoints either support min/max ID or unique IDs: ${msg}`);
            return rows;
        }
    }
    // Construct an Account or Toot object from the API object (otherwise just return the object)
    buildFromApiObjects(key, objects, logger) {
        if (Storage_1.STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            const accounts = objects.map(o => account_1.default.build(o));
            return (0, collection_helpers_1.uniquifyByProp)(accounts, (obj) => obj.id, key);
        }
        else if (Storage_1.STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            const toots = objects.map(obj => obj instanceof toot_1.default ? obj : toot_1.default.build(obj));
            return toot_1.default.dedupeToots(toots, logger.tempLogger(`buildFromApiObjects()`));
        }
        else if (Storage_1.STORAGE_KEYS_WITH_UNIQUE_IDS.includes(key)) {
            return (0, collection_helpers_1.uniquifyByProp)(objects, (obj) => obj.id, key);
        }
        else {
            return objects;
        }
    }
    // Returns true if the cache is fresh and we don't need to fetch more data
    shouldReturnCachedRows(params) {
        const { cacheResult, moar } = params;
        return cacheResult?.rows && !cacheResult.isStale && !moar;
    }
    // Check that the params passed to the fetch methods are valid and work together
    validateFetchParams(params) {
        let { cacheKey, logger, maxId, maxIdForFetch, minIdForFetch, moar, skipCache } = params;
        if (moar && (skipCache || maxId)) {
            logger.warn(`skipCache=true AND moar or maxId set!`);
        }
        if (maxIdForFetch && minIdForFetch) {
            this.logger.logAndThrowError(`maxIdForFetch and minIdForFetch can't be used at same time!`, params);
        }
        // HASHTAG_TOOTS is a special case that doesn't use the cache and has no min/max ID that also spams logs
        if (cacheKey != enums_1.CacheKey.HASHTAG_TOOTS) {
            const paramsToLog = (0, collection_helpers_1.removeKeys)(params, PARAMS_TO_NOT_LOG, PARAMS_TO_NOT_LOG_IF_FALSE);
            if (this.shouldReturnCachedRows(params)) {
                logger.trace(`Returning cached rows w/params:`, paramsToLog);
            }
            else if (paramsToLog.minIdForFetch || paramsToLog.maxIdForFetch) {
                logger.debug(`Incremental fetch from API to update cache:`, paramsToLog);
            }
            else {
                logger.trace(`Fetching new data from API w/params:`, paramsToLog);
            }
        }
    }
    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////
    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(logger, error, msg) {
        logger.error(`${msg}. Error:`, error);
        if (isAccessTokenRevokedError(error))
            throw error;
    }
    // Throw just a simple string as the error if it's a rate limit error; otherwise re-raise
    static throwSanitizedRateLimitError(error, msg) {
        if (isRateLimitError(error)) {
            apiLogger.error(`Rate limit error:`, error);
            throw RATE_LIMIT_USER_WARNING;
        }
        else {
            apiLogger.logAndThrowError(msg, error);
        }
    }
}
exports.default = MastoApi;
;
// Populate the various fetch options with basic defaults
function fillInDefaultParams(params) {
    let { cacheKey, logger, maxId, maxRecords, moar, skipCache, skipMutex } = params;
    const requestDefaults = config_1.config.api.data[cacheKey];
    const maxApiRecords = maxRecords || requestDefaults?.initialMaxRecords || config_1.MIN_RECORDS_FOR_FEATURE_SCORING;
    const withDefaults = {
        ...params,
        breakIf: params.breakIf || null,
        limit: Math.min(maxApiRecords, requestDefaults?.limit ?? config_1.config.api.defaultRecordsPerPage),
        logger: logger || getLogger(cacheKey),
        maxId: maxId || null,
        maxRecords: maxApiRecords,
        maxCacheRecords: requestDefaults?.maxCacheRecords,
        moar: moar || false,
        processFxn: params.processFxn || null,
        skipCache: skipCache || false,
        skipMutex: skipMutex || false,
    };
    return withDefaults;
}
;
// Return true if the error is an access token revoked error
function isAccessTokenRevokedError(e) {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }
    return e.message.includes(ACCESS_TOKEN_REVOKED_MSG);
}
exports.isAccessTokenRevokedError = isAccessTokenRevokedError;
;
// Return true if the error is an access token revoked error
function isRateLimitError(e) {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }
    return e.message.includes(RATE_LIMIT_ERROR_MSG);
}
exports.isRateLimitError = isRateLimitError;
;
//# sourceMappingURL=api.js.map