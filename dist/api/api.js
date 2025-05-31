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
const string_helpers_1 = require("../helpers/string_helpers");
const enums_1 = require("../enums");
const log_helpers_1 = require("../helpers/log_helpers");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const log_helpers_2 = require("../helpers/log_helpers");
const tag_1 = require("./objects/tag");
const enums_2 = require("../enums");
// Error messages for MastoHttpError
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const RATE_LIMIT_ERROR_MSG = "Too many requests"; // MastoHttpError: Too many requests
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";
const LOG_PREFIX = 'API';
const apiLogger = new log_helpers_1.ComponentLogger(LOG_PREFIX, 'static');
;
;
;
;
;
;
;
class MastoApi {
    static #instance; // Singleton instance of MastoApi
    api;
    homeDomain;
    logger;
    user;
    userData; // Save UserData in the API object to avoid polling local storage over and over
    waitTimes = {}; // Just for measuring performance (poorly)
    mutexes; // Mutexes for blocking singleton requests (e.g. followed accounts)
    requestSemphore = new async_mutex_1.Semaphore(config_1.config.api.maxConcurrentRequestsInitial); // Limit concurrency of search & tag requests
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
        // Initialize mutexes for each StorageKey
        this.mutexes = Object.keys(enums_1.CacheKey).reduce((acc, key) => {
            acc[enums_1.CacheKey[key]] = new async_mutex_1.Mutex();
            return acc;
        }, {});
    }
    // Get the user's home timeline feed (recent toots from followed accounts and hashtags).
    // TODO: should there be a mutex? Only called by triggerFeedUpdate() which can only run once at a time
    async fetchHomeFeed(params) {
        let { maxId, maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = enums_1.CacheKey.HOME_TIMELINE_TOOTS;
        const logger = getLogger(cacheKey, moar ? "moar" : "initial");
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
            const lookbackSeconds = config_1.config.api.data[enums_1.CacheKey.HOME_TIMELINE_TOOTS]?.lookbackForUpdatesMinutes * 60;
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
                logger.debug(`Got ${newStatuses.length} new toots, ${allStatuses.length} total (${oldestTootStr}), now build`);
                const newToots = await toot_1.default.buildToots(newStatuses, cacheKey);
                await mergeTootsToFeed(newToots, logger.logPrefix);
                allNewToots = allNewToots.concat(newToots);
                // Break the toot fetching loop if we encounter a toot older than cutoffAt
                if (oldestTootAt < cutoffAt) {
                    logger.log(`Halting fetch (${oldestTootStr} <= cutoff ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)})`);
                    return true;
                }
            }
        });
        homeTimelineToots = toot_1.default.dedupeToots([...allNewToots, ...homeTimelineToots], cacheKey);
        let msg = `Fetched ${allNewToots.length} new toots ${(0, time_helpers_1.ageString)(startedAt)} (${oldestTootStr}`;
        logger.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        homeTimelineToots = (0, toot_1.sortByCreatedAt)(homeTimelineToots).reverse(); // TODO: should we sort by score?
        homeTimelineToots = (0, collection_helpers_1.truncateToConfiguredLength)(homeTimelineToots, config_1.config.toots.maxTimelineLength, logger.logPrefix);
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
    // Generic data getter for things we want to cache but require custom fetch logic
    //    - maxRecordsConfigKey: optional config key to use to truncate the number of records returned
    async getCacheableToots(fetch, key, maxRecords) {
        const logger = getLogger(key);
        const releaseMutex = await (0, log_helpers_2.lockExecution)(this.mutexes[key], logger.logPrefix);
        const startedAt = new Date();
        try {
            let toots = await Storage_1.default.getIfNotStale(key);
            if (!toots) {
                const statuses = await fetch();
                logger.trace(`Retrieved ${statuses.length} Statuses ${(0, time_helpers_1.ageString)(startedAt)}`);
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
        return await this.getApiRecords({
            fetch: this.api.v1.notifications.list,
            cacheKey: enums_1.CacheKey.NOTIFICATIONS,
            ...(params || {})
        });
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
        const releaseMutex = await (0, log_helpers_2.lockExecution)(this.mutexes[enums_1.CacheKey.SERVER_SIDE_FILTERS], logger.logPrefix);
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
                logger.log(`Retrieved ${filters.length} records ${(0, time_helpers_1.ageString)(startTime)}:`, filters);
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
    async getStatusesForTag(tag, numToots) {
        numToots ||= config_1.config.trending.tags.numTootsPerTag;
        const startedAt = new Date();
        const tagToots = await Promise.all([
            this.searchForToots(tag.name, numToots),
            this.hashtagTimelineToots(tag, numToots),
        ]);
        logTrendingTagResults(`(getStatusesForTag(${tag.name}))`, "both hashtag searches", tagToots.flat(), startedAt);
        return tagToots.flat();
    }
    // Collect and fully populate / dedup a collection of toots for an array of Tags
    async getStatusesForTags(tags, numTootsPerTag) {
        this.logger.log(`(getStatusesForTags()) called for ${tags.length} tags:`, tags.map(t => t.name));
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
        const logger = getLogger(enums_1.CacheKey.HASHTAG_TOOTS, tag.name);
        const releaseSemaphore = await (0, log_helpers_2.lockExecution)(this.requestSemphore, logger.logPrefix);
        const startedAt = new Date();
        try {
            const toots = await this.getApiRecords({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                cacheKey: enums_1.CacheKey.HASHTAG_TOOTS,
                maxRecords: maxRecords,
                skipCache: true,
                skipMutex: true,
            });
            logger.trace(`Retrieved ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
            return toots;
        }
        catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logger.logPrefix} Failed ${(0, time_helpers_1.ageString)(startedAt)}`);
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
            this.logger.error(`<instanceInfo()> Failed to fetch user's instance info, trying V1 API:`, err);
            const v1Instance = await this.api.v1.instance.fetch();
            if (v1Instance) {
                let msg = `V2 instanceInfo() not available but v1 instance info exists. Unfortunately I will now discard it.`;
                (0, log_helpers_2.logAndThrowError)(msg, v1Instance);
            }
            else {
                (0, log_helpers_2.logAndThrowError)(`Failed to fetch Mastodon instance info from both V1 and V2 APIs`, err);
            }
        }
    }
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
            (0, log_helpers_2.logAndThrowError)(`${logger.logPrefix} got bad result for "${tootURI}"`, lookupResult);
        }
        const resolvedStatus = lookupResult.statuses[0];
        logger.trace(`found resolvedStatus for "${tootURI}":`, resolvedStatus);
        return toot_1.default.build(resolvedStatus);
    }
    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr, maxRecords) {
        maxRecords = maxRecords || config_1.config.api.defaultRecordsPerPage;
        const logger = getLogger(`searchForToots(${searchStr})`);
        const releaseSemaphore = await (0, log_helpers_2.lockExecution)(this.requestSemphore, logger.logPrefix);
        const query = { limit: maxRecords, q: searchStr, type: enums_2.TrendingType.STATUSES };
        logger.logPrefix += ` (semaphore)`;
        const startedAt = new Date();
        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            logger.trace(`Retrieved ${statuses.length} ${(0, time_helpers_1.ageString)(startedAt)}`);
            return statuses;
        }
        catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logger.logPrefix} Failed ${(0, time_helpers_1.ageString)(startedAt)}`);
            return [];
        }
        finally {
            releaseSemaphore();
        }
    }
    reset() {
        this.logger.log(`Resetting MastoApi instance...`);
        this.setSemaphoreConcurrency(config_1.config.api.maxConcurrentRequestsInitial);
        this.userData = undefined; // Clear the user data cache
        this.waitTimes = {}; // Reset the waiting timer
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
        let { cacheKey, logger } = inParams;
        logger ??= getLogger(cacheKey, 'getApiRecords()');
        const fullParams = fillInBasicDefaults({ ...inParams, logger });
        const { skipMutex } = fullParams;
        // Lock mutex before checking cache (unless skipMutex is true)
        const releaseMutex = skipMutex ? null : await (0, log_helpers_2.lockExecution)(this.mutexes[cacheKey], logger.logPrefix);
        const completedParams = await this.addCacheDataToParams({ ...fullParams, logger });
        let { breakIf, cacheResult, fetch, moar, processFxn, skipCache, maxRecords } = completedParams;
        // If cache is fresh return it unless 'moar' flag is set (Storage.get() handled the deserialization of Toots etc.)
        if (cacheResult?.rows && !cacheResult.isStale && !moar) {
            releaseMutex?.(); // TODO: seems a bit dangerous to handle the mutex outside of try/finally...
            return cacheResult?.rows;
        }
        logger.trace(`Cache is stale or moar=true, proceeding to fetch from API w/ completedParams:`, completedParams);
        let cachedRows = cacheResult?.rows || [];
        let pageNumber = 0;
        let rows = [];
        // Telemetry stuff that should be removed eventually
        this.waitTimes[cacheKey] ??= new log_helpers_2.WaitTime();
        this.waitTimes[cacheKey].markStart();
        try {
            for await (const page of fetch(this.buildParams(completedParams))) {
                this.waitTimes[cacheKey].markEnd(); // telemetry
                // the important stuff
                rows = rows.concat(page);
                pageNumber += 1;
                const shouldStop = breakIf ? (await breakIf(page, rows)) : false; // breakIf() must be called before we check the length of rows!
                const recordsSoFar = `${page.length} in page, ${rows.length} records so far ${this.waitTimes[cacheKey].ageString()}`;
                if (rows.length >= maxRecords || page.length == 0 || shouldStop) {
                    logger.debug(`Completing fetch at page ${pageNumber}, ${recordsSoFar}, shouldStop=${shouldStop}`);
                    break;
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
            rows = this.handleApiError(completedParams, rows, this.waitTimes[cacheKey].startedAt, e);
            cachedRows = []; // Set cachedRows to empty because hanldeApiError() already handled the merge
        }
        finally {
            releaseMutex?.();
        }
        // If endpoint has unique IDs (e.g. Toots) then we merge the cached rows with the new ones
        // (they will be deduped in buildFromApiObjects() if needed)
        if (Storage_1.STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
            rows = [...cachedRows, ...rows];
        }
        const objs = this.buildFromApiObjects(cacheKey, rows, logger);
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
        let { cacheKey, logger, maxId, maxRecords, moar, skipCache } = params;
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
                logger.info(`Getting MOAR data; loading backwards from maxId "${minMaxIdParams.maxIdForFetch}"`);
            }
            else {
                // TODO: is this right? we used to return the cached data quickly if it was OK...
                minMaxIdParams.minIdForFetch = cacheResult.minMaxId.max;
                logger.info(`Incremental load possible; setting minId="${minMaxIdParams.minIdForFetch}"`);
            }
        }
        else if (maxId) {
            minMaxIdParams.maxIdForFetch = maxId; // If we have a manually provided maxId use it as the maxIdForFetch
        }
        // If 'moar' flag is set, add another unit of maxRecords to the row count we have now
        if (cacheResult && moar) {
            const newMaxRecords = maxRecords + cacheResult.rows.length;
            logger.info(`Increasing maxRecords to ${newMaxRecords} for MOAR request`);
            maxRecords = newMaxRecords;
        }
        const completedParams = {
            ...minMaxIdParams,
            ...params,
            cacheResult,
            maxRecords,
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
        return {
            isStale: cachedData.isStale,
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
        const { cacheResult, cacheKey, logger } = params;
        const cachedRows = cacheResult?.rows || [];
        let msg = `Error: "${err}" after pulling ${rows.length} rows (cache: ${cachedRows.length} rows).`;
        MastoApi.throwIfAccessTokenRevoked(err, `${logger.logPrefix} Failed ${(0, time_helpers_1.ageString)(startedAt)}. ${msg}`);
        // If endpoint doesn't support min/max ID and we have less rows than we started with use old rows
        // TODO: i think we can just check for the existence of minMaxId in cacheResult?
        if (!this.supportsMinMaxId(cacheKey)) {
            msg += ` Endpoint doesn't support incremental min/max ID.`;
            if (rows.length < cachedRows.length) {
                logger.warn(`${msg} Discarding new rows and returning old ones bc there's more of them.`);
                return cachedRows;
            }
            else {
                logger.warn(`${msg} Keeping the new rows, discarding cached rows bc there's more of them.`);
                return rows;
            }
        }
        else if (Storage_1.STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
            logger.warn(`${msg} Merging cached rows with new rows.`);
            return [...cachedRows, ...rows];
        }
        else {
            logger.error(`Shouldn't be here! All endpoints either support min/max ID or unique IDs: ${msg}`);
            return rows;
        }
    }
    // Construct an Account or Toot object from the API object (otherwise just return the object)
    buildFromApiObjects(key, objects, logger) {
        logger.trace(`(buildFromApiObjects) called for key "${key}" with ${objects.length} objects`);
        if (Storage_1.STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            const accounts = objects.map(o => account_1.default.build(o));
            return (0, collection_helpers_1.uniquifyByProp)(accounts, (obj) => obj.id, key);
        }
        else if (Storage_1.STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            const toots = objects.map(obj => obj instanceof toot_1.default ? obj : toot_1.default.build(obj));
            return toot_1.default.dedupeToots(toots, `${key} buildFromApiObjects`);
        }
        else if (Storage_1.STORAGE_KEYS_WITH_UNIQUE_IDS.includes(key)) {
            return (0, collection_helpers_1.uniquifyByProp)(objects, (obj) => obj.id, key);
        }
        else {
            return objects;
        }
    }
    // Check that the params passed to the fetch methods are valid and work together
    validateFetchParams(params) {
        let { logger, maxId, maxIdForFetch, minIdForFetch, moar, skipCache } = params;
        logger.trace(`(validateFetchParams()) params:`, params);
        if (moar && (skipCache || maxId)) {
            logger.warn(`skipCache=true AND moar or maxId set!`);
        }
        if (maxIdForFetch && minIdForFetch) {
            (0, log_helpers_2.logAndThrowError)(`Both maxIdForFetch="${maxIdForFetch}" and minIdForFetch="${minIdForFetch}" set!`, params);
        }
    }
    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////
    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(error, msg) {
        apiLogger.error(`${msg}. Error:`, error);
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
            (0, log_helpers_2.logAndThrowError)(msg, error);
        }
    }
}
exports.default = MastoApi;
;
// Populate the various option booleans and things from the Config
function fillInBasicDefaults(params) {
    let { cacheKey, logger, maxId, maxRecords, moar, skipCache, skipMutex } = params;
    const requestDefaults = config_1.config.api.data[cacheKey];
    maxRecords = maxRecords || requestDefaults?.initialMaxRecords || config_1.MIN_RECORDS_FOR_FEATURE_SCORING;
    return {
        ...params,
        breakIf: params.breakIf || null,
        limit: Math.min(maxRecords, requestDefaults?.limit ?? config_1.config.api.defaultRecordsPerPage),
        logger: logger || getLogger(cacheKey),
        maxId: maxId || null,
        maxRecords: maxRecords,
        moar: moar || false,
        processFxn: params.processFxn || null,
        skipCache: skipCache || false,
        skipMutex: skipMutex || false,
    };
}
// logs prefixed by [API]
function getLogger(subtitle, subsubtitle) {
    return new log_helpers_1.ComponentLogger((0, string_helpers_1.bracketed)(LOG_PREFIX), subtitle, subsubtitle);
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
// TODO: get rid of this eventually
const logTrendingTagResults = (logPrefix, searchMethod, toots, startedAt) => {
    let msg = `${logPrefix} ${searchMethod} found ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`;
    msg += ` (oldest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))}, newest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.mostRecentTootedAt)(toots))}):`;
    apiLogger.debug(msg);
};
//# sourceMappingURL=api.js.map