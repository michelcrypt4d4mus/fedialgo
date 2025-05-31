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
const DEFAULT_BREAK_IF = async (pageOfResults, allResults) => undefined;
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
            return await this.api.v1.instance.fetch();
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
    async checkCache(params) {
        let { cacheKey, logger, maxRecords, moar, supportsMinMaxId } = params;
        logger ??= getLogger(cacheKey);
        // Get the data from the cache
        const cachedData = await Storage_1.default.getWithStaleness(cacheKey);
        if (!cachedData?.obj) {
            logger.trace(`No cached data for ${cacheKey}, returning null`);
            return { rows: null };
        }
        const rows = cachedData?.obj;
        // Return the cachedRows if they exist, the data is not stale, and moar is false
        return {
            isStale: cachedData.isStale,
            minMaxId: supportsMinMaxId ? (0, collection_helpers_1.findMinMaxId)(rows) : null,
            // If 'moar' flag is set, add another unit of maxRecords to the row count we have now
            newMaxRecords: moar ? (maxRecords + rows.length) : undefined,
            rows,
        };
    }
    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    async getApiRecords(inParams) {
        let { cacheKey, fetch, logger, moar, processFxn, skipCache, skipMutex } = inParams;
        logger ??= getLogger(cacheKey, moar ? "MOAR" : undefined);
        const startedAt = new Date();
        // Lock mutex unless skipMutex is true then load cache + compute params for actual API request
        const releaseMutex = skipMutex ? null : (await (0, log_helpers_2.lockExecution)(this.mutexes[cacheKey], logger.logPrefix));
        const params = await this.completeParamsWithCache(inParams);
        let { breakIf, cacheResult, maxRecords, supportsMinMaxId } = params;
        const cachedRows = cacheResult.rows || [];
        // If cache is fresh return it unless 'moar' flag is set (Storage.get() handled the deserialization of Toots etc.)
        if (cacheResult && !cacheResult.isStale && cachedRows && !moar) {
            return cachedRows;
        }
        maxRecords = cacheResult?.newMaxRecords || maxRecords; // TODO: is this right w/maxRecords?
        let pageNumber = 0;
        let rows = [];
        try {
            for await (const page of fetch(this.buildParams(params))) {
                this.waitTimes[cacheKey].markEnd(); // TODO: telemetry stuff that should be removed eventually
                // The actual action
                rows = rows.concat(page);
                pageNumber += 1;
                const shouldStop = await breakIf(page, rows); // Must be called before we check the length of rows!
                const recordsSoFar = `${page.length} in page, ${rows.length} records so far ${(0, time_helpers_1.ageString)(startedAt)}`;
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
            // TODO: handle rate limiting errors
            // If the access token was not revoked whatever rows we've retrieved will be returned
            MastoApi.throwIfAccessTokenRevoked(e, `${logger.logPrefix} Failed ${(0, time_helpers_1.ageString)(startedAt)}, have ${rows.length} rows`);
            let msg = `Error: "${e}" after ${rows.length} new rows, cache has ${cachedRows.length} rows.`;
            // If endpoint doesn't support min/max ID and we have less rows than we started with use old rows
            if (!supportsMinMaxId) {
                msg += ` Endpoint doesn't support incremental min/max ID.`;
                if (rows.length < cachedRows.length) {
                    console.warn(`${msg} Discarding new rows and returning old ones bc there's more.`);
                    return cachedRows;
                }
                else {
                    logger.warn(`${msg} Keeping the new rows, discarding the cached ones bc there's more.`);
                }
            }
            else if (Storage_1.STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
                logger.warn(`${msg} Merging cached rows with new rows.`);
                rows = [...cachedRows, ...rows];
            }
            else {
                throw new Error(`Shouldn't be here! All endpoints either support min/max ID or unique IDs: ${msg}`, { cause: e });
            }
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
    buildParams(params) {
        const { limit, minId, maxId } = params;
        let apiParams = { limit };
        if (minId)
            apiParams = { ...apiParams, minId: `${minId}` };
        if (maxId)
            apiParams = { ...apiParams, maxId: `${maxId}` };
        return apiParams;
    }
    // Check the cache, consult the endpoint defaults, and fill out a complete set of request parameters
    // along with the cachedResult (if any).
    async completeParamsWithCache(params) {
        let { cacheKey, logger, maxId, maxRecords, moar, skipCache } = params;
        // Get some defaults set up
        logger ??= getLogger(cacheKey);
        const requestDefaults = config_1.config.api.data[cacheKey];
        const supportsMinMaxId = requestDefaults?.supportsMinMaxId ?? false;
        maxRecords = maxRecords || requestDefaults?.initialMaxRecords || config_1.MIN_RECORDS_FOR_FEATURE_SCORING;
        // Check the cache and get the min/max ID for next request if supported
        const cacheParams = { ...params, maxRecords, supportsMinMaxId };
        const cacheResult = skipCache ? null : await this.checkCache(cacheParams);
        let minId = null;
        // If min/maxId is supported then we find the min/max ID in the cached data to use in the next request
        // If we're pulling "moar" old data, use the min ID of the cache as the request maxId
        // If we're incrementally updating stale data, use the max ID of the cache as the request minId
        if (cacheResult?.minMaxId) {
            if (moar) {
                if (maxId)
                    logger.warn(`maxId param "${maxId}" but overwriting w/minID in cache "${cacheResult.minMaxId.min}"!`);
                maxId = cacheResult.minMaxId.min;
                logger.debug(`Getting MOAR data; loading backwards from maxId "${maxId}"`);
            }
            else {
                // TODO: is this right? we used to return the cached data quickly if it was OK...
                minId = cacheResult.minMaxId.max;
                logger.debug(`Stale-ish data; doing incremental load from minId="${minId}"`);
            }
        }
        else {
            // If maxId isn't supported then we don't start with the cached data in the 'rows' array
            logger.debug(`maxId not supported, no cache, or skipped cache. cacheResult:`, cacheResult);
        }
        const completedParams = {
            ...cacheParams,
            breakIf: params.breakIf ?? DEFAULT_BREAK_IF,
            cacheResult,
            limit: Math.min(maxRecords, requestDefaults?.limit ?? config_1.config.api.defaultRecordsPerPage),
            logger,
            maxId: maxId ?? null,
            minId,
            maxRecords,
            moar: moar ?? false,
            processFxn: params.processFxn ?? null,
            skipCache: skipCache ?? false,
            skipMutex: params.skipMutex ?? false,
            supportsMinMaxId,
        };
        this.validateFetchParams(completedParams);
        return completedParams;
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
        else if (Storage_1.STORAGE_KEYS_WITH_UNIQUE_IDS.includes(key)) {
            return (0, collection_helpers_1.uniquifyByProp)(objects, (obj) => obj.id, key);
        }
        else {
            return objects;
        }
    }
    validateFetchParams(params) {
        let { cacheKey, cacheResult, logger, maxId, maxRecords, minId, moar, skipCache } = params;
        logger ??= getLogger(cacheKey);
        logger.trace(`(validateFetchParams()) params:`, params);
        if (moar && (skipCache || maxId))
            logger.warn(`skipCache=true AND moar or maxId set!`);
        if (minId && maxId)
            logger.warn(`Both minId="${minId}" and maxId="${maxId}" set!`);
        if (maxRecords && cacheResult?.newMaxRecords && maxRecords < cacheResult.newMaxRecords) {
            logger.warn(`maxRecords=${maxRecords} < cacheResult.newMaxRecords=${cacheResult.newMaxRecords}, should we be using ${cacheResult.newMaxRecords}?`);
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