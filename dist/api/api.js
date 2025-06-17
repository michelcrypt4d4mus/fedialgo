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
exports.isRateLimitError = exports.isAccessTokenRevokedError = exports.FULL_HISTORY_PARAMS = exports.BIG_NUMBER = void 0;
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./objects/account"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importStar(require("./objects/toot"));
const user_data_1 = __importDefault(require("./user_data"));
const time_helpers_1 = require("../helpers/time_helpers");
const config_1 = require("../config");
const string_helpers_1 = require("../helpers/string_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const logger_1 = require("../helpers/logger");
const tag_1 = require("./objects/tag");
const time_helpers_2 = require("../helpers/time_helpers");
const enums_1 = require("../enums");
const collection_helpers_1 = require("../helpers/collection_helpers");
;
;
;
;
;
;
;
;
;
exports.BIG_NUMBER = 10000000000;
exports.FULL_HISTORY_PARAMS = { maxRecords: exports.BIG_NUMBER, moar: true };
// Error messages for MastoHttpError
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const RATE_LIMIT_ERROR_MSG = "Too many requests"; // MastoHttpError: Too many requests
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";
// Mutex locking and concurrency
const USER_DATA_MUTEX = new async_mutex_1.Mutex(); // For locking user data fetching
// Logging
const PARAMS_TO_NOT_LOG = ["breakIf", "fetchGenerator", "logger", "processFxn"];
const PARAMS_TO_NOT_LOG_IF_FALSE = ["skipCache", "skipMutex", "moar"];
// Loggers prefixed by [API]
const getLogger = logger_1.Logger.logBuilder('API');
const apiLogger = getLogger();
/**
 * Singleton class for interacting with the authenticated Mastodon API for the user's home server.
 * Handles caching, concurrency, and provides methods for fetching and updating Mastodon data.
 * @property {mastodon.rest.Client} api - The Mastodon REST API client instance.
 * @property {Error[]} apiErrors - Array of errors encountered while using the API.
 * @property {string} homeDomain - The Fedialgo user's home server domain.
 * @property {Logger} logger - API logger instance.
 * @property {Account} user - The Fedialgo user's Account object.
 * @property {UserData} [userData] - The Fedialgo user's historical info.
 * @property {Record<CacheKey, WaitTime>} waitTimes - Tracks the amount of time spent waiting for each endpoint's API responses.
 */
class MastoApi {
    static #instance;
    api;
    apiErrors = [];
    homeDomain;
    logger = getLogger();
    user;
    userData;
    waitTimes = (0, enums_1.buildCacheKeyDict)(() => new log_helpers_1.WaitTime());
    apiMutexes = (0, enums_1.buildCacheKeyDict)(() => new async_mutex_1.Mutex()); // For locking data fetching for an API endpoint
    cacheMutexes = (0, enums_1.buildCacheKeyDict)(() => new async_mutex_1.Mutex()); // For locking checking the cache for an API endpoint
    requestSemphore = new async_mutex_1.Semaphore(config_1.config.api.maxConcurrentHashtagRequests); // Concurrency of search & hashtag requests
    /**
     * Initializes the singleton MastoApi instance with the provided Mastodon API client and user account.
     * If an instance already exists, logs a warning and does nothing.
     * Loads user data from storage and assigns it to the instance.
     * @param {mastodon.rest.Client} api - The Mastodon REST API client.
     * @param {Account} user - The authenticated user account.
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    static async init(api, user) {
        if (!(user.webfingerURI?.includes('@'))) {
            apiLogger.logAndThrowError(`MastoApi.init() 'user' argument isn't an Account!`, user);
        }
        else if (MastoApi.#instance) {
            apiLogger.warn(`MastoApi instance already initialized...`);
            return;
        }
        apiLogger.log(`Initializing MastoApi instance with user:`, user.acct);
        MastoApi.#instance = new MastoApi(api, user);
        MastoApi.#instance.userData = await Storage_1.default.loadUserData(); // Instantiate userData from the cache
    }
    /**
     * Returns the singleton instance of MastoApi.
     * @returns {MastoApi}
     * @throws {Error} If the instance has not been initialized.
     */
    static get instance() {
        if (!MastoApi.#instance)
            throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }
    /**
     * Private constructor for MastoApi. Instantiate with `MastoApi.init()`.
     * @param {mastodon.rest.Client} api - Mastodon REST API client.
     * @param {Account} user - The authenticated user account.
     */
    constructor(api, user) {
        this.api = api;
        this.user = user;
        this.homeDomain = user.homeserver;
        this.reset();
    }
    /**
     * Get the value of some MastoApi object's properties. For debugging/presentation only.
     * @returns {Record<string, object|string>}
     */
    currentState() {
        return {
            apiErrors: this.apiErrors,
            homeDomain: this.homeDomain,
            user: this.user,
            waitTimes: this.waitTimes,
        };
    }
    /**
     * Fetches the user's home timeline feed (recent toots from followed accounts and hashtags).
     * @param {HomeTimelineParams} params - Parameters for fetching the home feed.
     * @returns {Promise<Toot[]>} Array of Toots in the home feed.
     */
    async fetchHomeFeed(params) {
        const { maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = enums_1.CacheKey.HOME_TIMELINE_TOOTS;
        const logger = this.loggerForParams({ ...params, cacheKey });
        let { maxId } = params;
        let homeTimelineToots = await Storage_1.default.getCoerced(cacheKey);
        let allNewToots = [];
        let cutoffAt = (0, time_helpers_1.timelineCutoffAt)();
        let oldestTootStr = "no oldest toot";
        const startedAt = new Date();
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
        const _incompleteToots = await this.getApiObjsAndUpdate({
            fetchGenerator: () => this.api.v1.timelines.home.list,
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
        const msg = `Fetched ${allNewToots.length} new toots ${(0, time_helpers_1.ageString)(startedAt)} (${oldestTootStr}`;
        logger.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        homeTimelineToots = (0, toot_1.sortByCreatedAt)(homeTimelineToots).reverse(); // TODO: should we sort by score?
        homeTimelineToots = (0, collection_helpers_1.truncateToConfiguredLength)(homeTimelineToots, config_1.config.toots.maxTimelineLength, logger);
        await Storage_1.default.set(cacheKey, homeTimelineToots);
        return homeTimelineToots;
    }
    /**
     * Gets the accounts blocked by the user (does not include muted accounts).
     * @returns {Promise<Account[]>} Array of blocked accounts.
     */
    async getBlockedAccounts() {
        const blockedAccounts = await this.getApiObjsAndUpdate({
            cacheKey: enums_1.CacheKey.BLOCKED_ACCOUNTS,
            fetchGenerator: () => this.api.v1.blocks.list,
        });
        account_1.default.logSuspendedAccounts(blockedAccounts, enums_1.CacheKey.BLOCKED_ACCOUNTS);
        return blockedAccounts;
    }
    /**
     * Gets the Mastodon server domains that the user has blocked
     * Safe domain for testing: https://universeodon.com/@memes@pl.m0e.space
     * @returns {Promise<string[]>} Set of blocked domains.
     */
    async getBlockedDomains() {
        const domains = await this.getApiObjsAndUpdate({
            cacheKey: enums_1.CacheKey.BLOCKED_DOMAINS,
            fetchGenerator: () => this.api.v1.domainBlocks.list,
        });
        return domains.map(domain => domain.toLowerCase().trim());
    }
    /**
     * Generic data getter for cacheable Toots with custom fetch logic.
     * Used for various hashtag feeds (participated, trending, favourited).
     * @param {() => Promise<TootLike[]>} fetchStatuses - Function to fetch statuses.
     * @param {ApiCacheKey} cacheKey - Cache key for storage.
     * @param {number} maxRecords - Maximum number of records to fetch.
     * @returns {Promise<Toot[]>} Array of Toots.
     */
    async getCacheableToots(fetchStatuses, cacheKey, maxRecords) {
        const logger = getLogger(cacheKey);
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.apiMutexes[cacheKey], logger);
        this.waitTimes[cacheKey].markStart(); // Telemetry stuff that should be removed eventually
        try {
            let toots = await Storage_1.default.getIfNotStale(cacheKey);
            if (!toots) {
                const statuses = await fetchStatuses();
                logger.trace(`Retrieved ${statuses.length} Toots ${this.waitTimes[cacheKey].ageString()}`);
                toots = await toot_1.default.buildToots(statuses, cacheKey);
                toots = (0, collection_helpers_1.truncateToConfiguredLength)(toots, maxRecords, logger);
                await Storage_1.default.set(cacheKey, toots);
            }
            return toots;
        }
        catch (err) {
            // TODO: the hacky cast is because ApiCacheKey is broader than CacheKey
            this.handleApiError({ cacheKey: cacheKey, logger }, [], err);
            return [];
        }
        finally {
            this.waitTimes[cacheKey].markEnd();
            releaseMutex();
        }
    }
    /**
     * Gets the toots recently favourited by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Toot[]>} Array of favourited Toots.
     */
    async getFavouritedToots(params) {
        return await this.getApiObjsAndUpdate({
            cacheKey: enums_1.CacheKey.FAVOURITED_TOOTS,
            fetchGenerator: () => this.api.v1.favourites.list,
            ...(params || {})
        });
    }
    /**
     * Gets the accounts followed by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of followed accounts.
     */
    async getFollowedAccounts(params) {
        return await this.getWithBackgroundFetch({
            cacheKey: enums_1.CacheKey.FOLLOWED_ACCOUNTS,
            fetchGenerator: () => this.api.v1.accounts.$select(this.user.id).following.list,
            minRecords: this.user.followingCount - 10,
            processFxn: (account) => account.isFollowed = true,
            ...(params || {})
        });
    }
    /**
     * Gets the hashtags followed by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<mastodon.v1.Tag[]>} Array of followed tags.
     */
    async getFollowedTags(params) {
        return await this.getApiObjsAndUpdate({
            cacheKey: enums_1.CacheKey.FOLLOWED_TAGS,
            fetchGenerator: () => this.api.v1.followedTags.list,
            processFxn: (tag) => (0, tag_1.repairTag)(tag),
            ...(params || {})
        });
    }
    /**
     * Gets the followers of the Fedialgo user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of follower accounts.
     */
    async getFollowers(params) {
        return await this.getWithBackgroundFetch({
            cacheKey: enums_1.CacheKey.FOLLOWERS,
            fetchGenerator: () => this.api.v1.accounts.$select(this.user.id).followers.list,
            minRecords: this.user.followersCount - 10,
            processFxn: (account) => account.isFollower = true,
            ...(params || {})
        });
    }
    /**
     * Get the public toots on the user's home server (recent toots from users on the same server).
     * @param {ApiParams} params
     * @returns {Promise<Toot[]>} Array of public toots from the home server.
     */
    async getHomeserverToots(params) {
        return await this.getApiObjsAndUpdate({
            cacheKey: enums_1.CacheKey.HOMESERVER_TOOTS,
            fetchGenerator: () => this.api.v1.timelines.public.list,
            local: true,
            ...(params || {})
        });
    }
    /**
     * Gets all muted accounts (including fully blocked accounts).
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of muted and blocked accounts.
     */
    async getMutedAccounts(params) {
        const mutedAccounts = await this.getApiObjsAndUpdate({
            cacheKey: enums_1.CacheKey.MUTED_ACCOUNTS,
            fetchGenerator: () => this.api.v1.mutes.list,
            ...(params || {})
        });
        account_1.default.logSuspendedAccounts(mutedAccounts, enums_1.CacheKey.MUTED_ACCOUNTS);
        return mutedAccounts.concat(await this.getBlockedAccounts());
    }
    /**
     * Gets the user's recent notifications.
     * @param {ApiParamsWithMaxID} [params] - Optional parameters.
     * @returns {Promise<mastodon.v1.Notification[]>} Array of notifications.
     */
    async getNotifications(params) {
        return await this.getApiObjsAndUpdate({
            cacheKey: enums_1.CacheKey.NOTIFICATIONS,
            fetchGenerator: () => this.api.v1.notifications.list,
            ...(params || {})
        });
    }
    /**
     * Gets the user's recent toots.
     * @param {ApiParamsWithMaxID} [params] - Optional parameters.
     * @returns {Promise<Toot[]>} Array of recent user Toots.
     */
    async getRecentUserToots(params) {
        return await this.getApiObjsAndUpdate({
            cacheKey: enums_1.CacheKey.RECENT_USER_TOOTS,
            fetchGenerator: () => this.api.v1.accounts.$select(this.user.id).statuses.list,
            ...(params || {})
        });
    }
    /**
     * Retrieves content-based feed filters set up by the user on the server.
     * @returns {Promise<mastodon.v2.Filter[]>} Array of server-side filters.
     */
    async getServerSideFilters() {
        const logger = getLogger(enums_1.CacheKey.SERVER_SIDE_FILTERS);
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.apiMutexes[enums_1.CacheKey.SERVER_SIDE_FILTERS], logger);
        const startTime = new Date();
        try {
            let filters = await Storage_1.default.getIfNotStale(enums_1.CacheKey.SERVER_SIDE_FILTERS);
            if (!filters) {
                filters = await this.api.v2.filters.list();
                // Filter out filters that either are just warnings or don't apply to the home context
                filters = filters.filter(filter => {
                    // Before Mastodon 4.0 Filter objects lacked a 'context' property altogether
                    if (filter.context?.length && !filter.context.includes("home"))
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
        catch (err) {
            const msg = `Failed to get server-side filters`;
            logger.error(msg, err);
            this.apiErrors.push(new Error(msg, { cause: err }));
            return [];
        }
        finally {
            releaseMutex();
        }
    }
    ;
    /**
     * Gets the latest toots for a given tag using both the Search API and tag timeline API.
     * The two APIs give results with surprisingly little overlap (~80% of toots are unique).
     * @param {string} tagName - The tag to search for.
     * @param {Logger} logger - Logger instance for logging.
     * @param {number} [numToots] - Number of toots to fetch.
     * @returns {Promise<TootLike[]>} Array of TootLike objects.
     */
    async getStatusesForTag(tagName, logger, numToots) {
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
        const msg = `#${tagName}: search endpoint got ${results.fulfilled[0]?.length || 0} toots, ` +
            `hashtag timeline got ${results.fulfilled[1]?.length || 0} ` +
            `${(0, time_helpers_1.ageString)(startedAt)} (total ${toots.length}, oldest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))}`;
        logger.trace(`${msg}, newest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.mostRecentTootedAt)(toots))})`);
        return toots;
    }
    /**
     * Retrieves background data about the user for scoring, etc. Caches as an instance variable.
     * @param {boolean} [force] - If true, forces a refresh from the API.
     * @returns {Promise<UserData>} The UserData object.
     */
    async getUserData(force) {
        const releaseMutex = await (0, log_helpers_1.lockExecution)(USER_DATA_MUTEX, this.logger);
        try {
            if (force || !this.userData?.hasNewestApiData()) {
                this.userData = await user_data_1.default.build();
            }
            return this.userData;
        }
        finally {
            releaseMutex();
        }
    }
    /**
     * Fetches toots from the tag timeline API (different from the search API).
     * Concurrency is managed by a semaphore. See https://docs.joinmastodon.org/methods/v1/timelines/#tag
     * TODO: Could maybe use min_id and max_id to avoid re-fetching the same data
     * @param {string} tagName - The tag to fetch toots for.
     * @param {Logger} logger - Logger instance for logging.
     * @param {number} [maxRecords] - Maximum number of records to fetch.
     * @returns {Promise<Toot[]>} Array of Toots.
     */
    async hashtagTimelineToots(tagName, logger, maxRecords) {
        maxRecords = maxRecords || config_1.config.api.defaultRecordsPerPage;
        const releaseSemaphore = await (0, log_helpers_1.lockExecution)(this.requestSemphore, logger);
        const startedAt = new Date();
        try {
            const toots = await this.getApiObjsAndUpdate({
                cacheKey: enums_1.CacheKey.HASHTAG_TOOTS,
                fetchGenerator: () => this.api.v1.timelines.tag.$select(tagName).list,
                logger,
                maxRecords,
                // hashtag timeline toots are not cached as a group, they're pulled in small amounts and used
                // to create other sets of toots from a lot of small requests, e.g. PARTICIPATED_TAG_TOOTS
                skipCache: true,
                // Concurrency is managed by the semaphore above, not the mutexes
                skipMutex: true,
            });
            logger.deep(`Retrieved ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
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
    /**
     * Retrieve the user's home instance (mastodon server) configuration from the API.
     * @returns {Promise<mastodon.v2.Instance>} The instance configuration.
     */
    async instanceInfo() {
        let instanceInfo = await Storage_1.default.getIfNotStale(enums_1.CacheKey.INSTANCE_INFO);
        if (!instanceInfo) {
            try {
                instanceInfo = await this.api.v2.instance.fetch();
                await Storage_1.default.set(enums_1.CacheKey.INSTANCE_INFO, instanceInfo);
            }
            catch (err) {
                this.logger.error(`<instanceInfo()> Failed to fetch user's instance info, trying V1 API:`, err);
                const v1Instance = await this.api.v1.instance.fetch();
                if (v1Instance) {
                    const msg = `V2 instanceInfo() not available but v1 instance info exists. Unfortunately I will now discard it.`;
                    this.logger.logAndThrowError(msg, v1Instance);
                }
                else {
                    this.logger.logAndThrowError(`Failed to fetch Mastodon instance info from both V1 and V2 APIs`, err);
                }
            }
        }
        return instanceInfo;
    }
    /**
     * Locks all API and cache mutexes for cache state operations.
     * @returns {Promise<ConcurrencyLockRelease[]>} Array of lock release functions.
     */
    async lockAllMutexes() {
        const allMutexes = Object.values(this.apiMutexes).concat(Object.values(this.cacheMutexes));
        const mutexLogger = apiLogger.tempLogger('lockAllMutexes');
        mutexLogger.log(`Locking all mutexes...`);
        return await Promise.all(allMutexes.map(mutex => (0, log_helpers_1.lockExecution)(mutex, mutexLogger)));
    }
    ;
    /**
     * Resolves a foreign server toot URI to one on the user's local server using the v2 search API.
     * transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
     *                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
     * @param {Toot} toot - The toot to resolve.
     * @returns {Promise<Toot>} The resolved toot.
     */
    async resolveToot(toot) {
        const logger = getLogger('resolveToot()', toot.realURI);
        logger.trace(`called for`, toot);
        if (toot.isLocal)
            return toot;
        const lookupResult = await this.api.v2.search.list({ q: toot.realURI, resolve: true });
        if (!lookupResult?.statuses?.length) {
            logger.logAndThrowError(`Got bad result for "${toot.realURI}"`, lookupResult);
        }
        const resolvedStatus = lookupResult.statuses[0];
        logger.trace(`found resolvedStatus for "${toot.realURI}":`, resolvedStatus);
        return toot_1.default.build(resolvedStatus);
    }
    /**
     * Performs a keyword substring search for toots using the search API.
     * @param {string} searchStr - The string to search for.
     * @param {Logger} logger - Logger instance for logging.
     * @param {number} [maxRecords] - Maximum number of records to fetch.
     * @returns {Promise<mastodon.v1.Status[]>} Array of status objects.
     */
    async searchForToots(searchStr, logger, maxRecords) {
        maxRecords = maxRecords || config_1.config.api.defaultRecordsPerPage;
        const releaseSemaphore = await (0, log_helpers_1.lockExecution)(this.requestSemphore, logger);
        const query = { limit: maxRecords, q: searchStr, type: enums_1.TrendingType.STATUSES };
        const startedAt = new Date();
        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            logger.deep(`Retrieved ${statuses.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
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
    /**
     * Resets the API state, clearing errors and user data, and resetting concurrency.
     */
    reset() {
        this.apiErrors = [];
        this.userData = undefined; // Clear the user data cache
        this.setSemaphoreConcurrency(config_1.config.api.maxConcurrentHashtagRequests);
    }
    ;
    /**
     * Sets the concurrency for the request semaphore.
     * @param {number} concurrency - The new concurrency value.
     */
    setSemaphoreConcurrency(concurrency) {
        this.logger.log(`Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new async_mutex_1.Semaphore(concurrency);
    }
    /**
     * Returns the URL for an account on the Feialgo user's home server.
     * @param {MastodonTag | string} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    accountUrl(account) {
        return account.homeserver == this.homeDomain ? account.url : this.endpointURL(`@${account.webfingerURI}`);
    }
    /**
     * Returns true if the URL is a local URL on the Feialgo user's home server.
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    isLocalUrl(url) {
        return (0, string_helpers_1.extractDomain)(url) == this.homeDomain;
    }
    /**
     * Returns the URL for a tag on the Feialgo user's home server.
     * @param {MastodonTag | string} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    tagUrl(tag) {
        return `${this.endpointURL(enums_1.TrendingType.TAGS)}/${typeof tag == "string" ? tag : tag.name}`;
    }
    /////////////////////////////
    //     Private Methods     //
    /////////////////////////////
    /**
     * Returns the URL for a given API endpoint on the user's home server.
     * @private
     * @param {string} endpoint - The API endpoint.
     * @returns {string} The full endpoint URL.
     */
    endpointURL = (endpoint) => `https://${this.homeDomain}/${endpoint}`;
    /**
     * Checks if the config supports min/max ID for a given cache key.
     * @private
     * @param {CacheKey} cacheKey - The cache key.
     * @returns {boolean} True if min/max ID is supported.
     */
    supportsMinMaxId = (cacheKey) => !!config_1.config.api.data[cacheKey]?.supportsMinMaxId;
    /**
     * Pure fetch of API records, no caching or background updates.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {Promise<ApiObj[]>} Array of API objects.
     */
    async fetchApiObjs(params) {
        this.validateFetchParams(params);
        const { breakIf, cacheKey, fetchGenerator, isBackgroundFetch, logger, maxRecords } = params;
        const waitTime = this.waitTimes[cacheKey];
        waitTime.markStart(); // Telemetry
        let newRows = [];
        let pageNumber = 0;
        try {
            for await (const page of fetchGenerator()(this.buildParams(params))) {
                waitTime.markEnd(); // telemetry
                newRows = newRows.concat(page);
                // breakIf() must be called before we check the length of rows!  // TODO: still necessary?
                const shouldStop = breakIf ? (await breakIf(page, newRows)) : false;
                let resultsMsg = `got page ${++pageNumber} with ${page.length} objs ${waitTime.ageString()}`;
                resultsMsg += `, ${newRows.length} objs so far`;
                if (newRows.length >= maxRecords || page.length == 0 || shouldStop) {
                    const msg = `Fetch finished (${resultsMsg}, shouldStop=${shouldStop}, maxRecords=${maxRecords})`;
                    (0, enums_1.isTagTootsCacheKey)(cacheKey) ? logger.trace(msg) : logger.debug(msg);
                    break;
                }
                else if (waitTime.ageInSeconds() > config_1.config.api.maxSecondsPerPage) {
                    logger.logAndThrowError(`Request took too long! (${waitTime.ageInSeconds()}s), ${resultsMsg}`);
                }
                else {
                    (pageNumber % 5 == 0) ? logger.debug(resultsMsg) : logger.trace(resultsMsg);
                }
                if (isBackgroundFetch) {
                    // Add jitter to space out requests
                    const sleepMS = config_1.config.api.backgroundLoadSleepBetweenRequestsMS + (Math.random() * 1000);
                    logger.trace(`Background fetch, sleeping for ${(sleepMS / 1000).toFixed(3)}s`);
                    await (0, time_helpers_2.sleep)(sleepMS);
                }
                waitTime.markStart(); // Reset timer for next page
            }
            if (cacheKey != enums_1.CacheKey.HASHTAG_TOOTS)
                logger.info(`Retrieved ${newRows.length} objects`);
            return newRows;
        }
        catch (e) {
            return this.handleApiError(params, newRows, e);
        }
    }
    /**
     * Returns cached rows immediately if they exist, triggers background update if stale.
     * @private
     * @template T
     * @param {FetchParams<T>} inParams - Fetch parameters.
     * @returns {Promise<ApiObj[]>} Array of API objects.
     */
    async getApiObjsAndUpdate(inParams) {
        const paramsWithCache = await this.addCacheDataToParams(inParams);
        const { cacheKey, cacheResult, logger, moar, skipMutex } = paramsWithCache;
        const hereLogger = logger.tempLogger('getApiObjsAndUpdate');
        const releaseMutex = skipMutex ? null : await (0, log_helpers_1.lockExecution)(this.cacheMutexes[cacheKey], hereLogger);
        try {
            // TODO: maybe check that there's more than 0 rows in the cache before returning them?
            // "moar" data requests are aleady running in their own background job so can afford to wait
            if (cacheResult && !moar) {
                if (cacheResult.isStale) {
                    // If the mutex is locked background load is in progress so don't start another one
                    if (this.apiMutexes[cacheKey].isLocked()) {
                        hereLogger.trace(`Stale cache but update already in progress, returning stale rows`);
                    }
                    else {
                        hereLogger.debug(`Returning ${cacheResult.rows.length} stale rows and triggering cache update`);
                        this.getApiObjs({ ...paramsWithCache, isBackgroundFetch: true });
                    }
                }
                return cacheResult.rows;
            }
            else {
                return await this.getApiObjs(paramsWithCache);
            }
        }
        finally {
            releaseMutex?.();
        }
    }
    /**
     * Generic Mastodon API fetcher. Uses cache if possible, fetches from API if cache is empty or stale.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {Promise<ResponseRow[]>} Array of API objects.
     */
    async getApiObjs(params) {
        const { cacheKey, isBackgroundFetch, maxCacheRecords, processFxn, skipCache, skipMutex } = params;
        const logger = params.logger.tempLogger('getApiObjs');
        params = { ...params, logger };
        if (this.apiMutexes[cacheKey].isLocked()) {
            if (isBackgroundFetch) {
                logger.trace(`Called but mutex already locked (background load in progress, nothing to do)`);
            }
            else {
                logger.error(`ApiMutex is already locked but shouldn't be! Returning empty array...`);
            }
            return [];
        }
        const releaseMutex = skipMutex ? null : await (0, log_helpers_1.lockExecution)(this.apiMutexes[cacheKey], logger);
        try {
            // Check the cache again, in case it was updated while we were waiting for the mutex
            params.cacheResult = await this.getCacheResult(params);
            const cachedRows = params.cacheResult?.rows || [];
            if (this.shouldReturnCachedRows(params)) {
                logger.trace(`Returning ${cachedRows.length} cached rows`);
                return cachedRows;
            }
            let newRows = await this.fetchApiObjs(params);
            // If endpoint has unique IDs use both cached and new rows (it's deduped in buildFromApiObjects())
            // newRows are in front so they will survive truncation (if it happens)
            newRows = enums_1.UNIQUE_ID_PROPERTIES[cacheKey] ? [...newRows, ...cachedRows] : newRows;
            const objs = this.buildFromApiObjects(cacheKey, newRows, logger);
            // If we have a maxCacheRecords limit, truncate the new rows to that limit
            if (maxCacheRecords && objs.length > maxCacheRecords) {
                logger.warn(`Truncating ${objs.length} rows to maxCacheRecords=${maxCacheRecords}`);
                // TODO: there's a Mastodon object w/out created_at, so this would break but for now that object has no maxCacheRecords set for that endpoint
                const sortedByCreatedAt = (0, collection_helpers_1.sortObjsByCreatedAt)(objs);
                newRows = (0, collection_helpers_1.truncateToConfiguredLength)(sortedByCreatedAt, maxCacheRecords, logger);
            }
            if (processFxn)
                objs.forEach(obj => obj && processFxn(obj));
            if (!skipCache)
                await Storage_1.default.set(cacheKey, objs);
            return objs;
        }
        catch (err) {
            const msg = `Error fetching API records for ${cacheKey} where there really shouldn't be!`;
            logger.error(msg, err);
            this.apiErrors.push(new Error(msg, { cause: err }));
            return [];
        }
        finally {
            releaseMutex?.();
        }
    }
    /**
     * Gets maxRecords, and if not more than minRecords, launches a background fetch.
     * @private
     * @template T
     * @param {BackgroundFetchparams<T>} params - Background fetch parameters.
     * @returns {Promise<ResponseRow[]>} Array of API objects.
     */
    async getWithBackgroundFetch(params) {
        const { minRecords } = params;
        const logger = this.loggerForParams(params).tempLogger('getWithBackgroundFetch');
        if (!params.fetchGenerator)
            logger.logAndThrowError(`Missing fetchGenerator!`, params);
        logger.trace(`Called with minRecords ${minRecords}`);
        const objs = await this.getApiObjsAndUpdate(params);
        if (objs.length < minRecords) {
            logger.log(`Fewer rows (${objs.length}) than required (${minRecords}), launching bg job to get the rest`);
            // TODO: can't import the ScorerCache here because it would create a circular dependency
            this.getApiObjsAndUpdate({ ...exports.FULL_HISTORY_PARAMS, ...params, isBackgroundFetch: true });
            // .then(() => ScorerCache.prepareScorers(true))  // Force ScorerCache to update
        }
        else {
            logger.trace(`Have enough rows (have ${objs.length}, want ${minRecords}), doing nothing`);
        }
        return objs;
    }
    /**
     * Builds API request parameters for pagination.
     * @private
     * @param {FetchParamsWithCacheData<any>} params - Fetch parameters with cache data.
     * @returns {mastodon.DefaultPaginationParams|mastodon.rest.v1.ListTimelineParams} API pagination parameters.
     */
    buildParams(params) {
        const { limit, local, minIdForFetch, maxIdForFetch } = params;
        let apiParams = { limit };
        if (minIdForFetch)
            apiParams = { ...apiParams, minId: `${minIdForFetch}` };
        if (maxIdForFetch)
            apiParams = { ...apiParams, maxId: `${maxIdForFetch}` };
        if (local)
            apiParams = { ...apiParams, local: true };
        return apiParams;
    }
    /**
     * Fills in defaults in params and derives min/maxIdForFetch from cached data if appropriate.
     * @private
     * @template T
     * @param {FetchParams<T>} inParams - Fetch parameters.
     * @returns {Promise<FetchParamsWithCacheData<T>>} Completed fetch parameters with cache data.
     */
    async addCacheDataToParams(inParams) {
        const params = this.fillInDefaultParams(inParams);
        const { logger, maxId, moar } = params;
        let { maxRecords } = params;
        const cacheResult = await this.getCacheResult(params);
        const minMaxIdParams = { maxIdForFetch: null, minIdForFetch: null };
        // If min/maxId is supported then we find the min/max ID in the cached data to use in the next request
        // If we're pulling "moar" old data, use the min ID of the cache as the request maxId
        // If we're incrementally updating stale data, use the max ID of the cache as the request minId
        if (cacheResult?.minMaxId) {
            if (moar) {
                if (maxId)
                    logger.warn(`maxId param "${maxId}" will overload minID in cache "${cacheResult.minMaxId.min}"!`);
                minMaxIdParams.maxIdForFetch = maxId || cacheResult.minMaxId.min;
            }
            else {
                minMaxIdParams.minIdForFetch = cacheResult.minMaxId.max;
            }
        }
        else if (maxId) {
            logger.info(`Loading backward from manually provided maxId: "${maxId}"`);
            minMaxIdParams.maxIdForFetch = maxId; // If we have a manually provided maxId use it as the maxIdForFetch
        }
        // If 'moar' flag is set, add another unit of maxRecords to the row count we have now
        if (cacheResult && moar) {
            maxRecords = maxRecords + cacheResult.rows.length;
            logger.info(`Increasing maxRecords for MOAR_DATA to ${maxRecords}`);
        }
        const completedParams = {
            ...minMaxIdParams,
            ...params,
            cacheResult,
            maxRecords,
        };
        return completedParams;
    }
    /**
     * Loads rows from the cache unless skipCache=true. Thin wrapper around Storage.getWithStaleness.
     * @private
     * @template T
     * @param {FetchParamsWithDefaults<T>} params - Fetch parameters with defaults.
     * @returns {Promise<CacheResult<T> | null>} Cached rows or null.
     */
    async getCacheResult(params) {
        const { bustCache, cacheKey, skipCache } = params;
        if (bustCache || skipCache)
            return null;
        const cachedData = await Storage_1.default.getWithStaleness(cacheKey);
        if (!cachedData)
            return null;
        const rows = cachedData.obj;
        // NOTE: Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
        // or future. For a while we used a small offset to the list of toots sorted by created_at instead
        // of the actual min/max.
        return {
            isStale: cachedData.isStale,
            // minMaxId is not returned  if endpoint doesn't support min/max ID API requests (even if it exists)
            minMaxId: this.supportsMinMaxId(cacheKey) ? (0, collection_helpers_1.findMinMaxId)(rows) : null,
            rows,
            updatedAt: cachedData.updatedAt,
        };
    }
    /**
     * Handles API errors and decides which rows to keep (cache, new, or both).
     * TODO: handle rate limiting errors.
     * @private
     * @template T
     * @param {Partial<FetchParamsWithCacheData<T>>} params - Partial fetch parameters.
     * @param {T[]} newRows - Rows fetched so far.
     * @param {Error | unknown} err - The error encountered.
     * @returns {T[]} Array of rows to use.
     */
    handleApiError(params, newRows, err) {
        let { cacheKey, logger } = params;
        const cacheResult = params.cacheResult;
        cacheKey ??= enums_1.CacheKey.HOME_TIMELINE_TOOTS; // TODO: this is a hack to avoid undefined cacheKey
        logger = logger ? logger.tempLogger('handleApiError') : getLogger(cacheKey, 'handleApiError');
        const startedAt = this.waitTimes[cacheKey].startedAt || Date.now();
        const cachedRows = cacheResult?.rows || [];
        let msg = `"${err} after pulling ${newRows.length} rows (cache: ${cachedRows.length} rows).`;
        this.apiErrors.push(new Error(logger.line(msg), { cause: err }));
        MastoApi.throwIfAccessTokenRevoked(logger, err, `Failed ${(0, time_helpers_1.ageString)(startedAt)}. ${msg}`);
        const rows = newRows; // buildFromApiObjects() will sort out the types later
        // If endpoint doesn't support min/max ID and we have less rows than we started with use old rows
        if (enums_1.UNIQUE_ID_PROPERTIES[cacheKey]) {
            logger.warn(`${msg} Merging cached + new rows on uniq property: "${enums_1.UNIQUE_ID_PROPERTIES[cacheKey]}"`);
            return [...cachedRows, ...rows];
        }
        else if (!cacheResult?.minMaxId) {
            msg += ` Query didn't use incremental min/max ID.`;
            if (newRows.length < cachedRows.length) {
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
    /**
     * Builds Account or Toot objects from the relevant raw API types (Account and Status). Other types
     * are returned as-is, possibly uniquified by ID.
     * @private
     * @param {CacheKey} key - The cache key.
     * @param {ApiObj[]} objects - Array of API objects.
     * @param {Logger} logger - Logger instance.
     * @returns {ApiObj[]} Array of constructed objects.
     */
    buildFromApiObjects(key, objects, logger) {
        let newObjects;
        // Toots get special handling for deduplication
        if (enums_1.STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            const toots = objects.map(obj => toot_1.default.build(obj));
            return toot_1.default.dedupeToots(toots, logger.tempLogger(`buildFromApiObjects`));
        }
        else if (enums_1.STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            newObjects = objects.map(obj => account_1.default.build(obj));
        }
        else {
            newObjects = objects;
        }
        return (0, collection_helpers_1.uniquifyApiObjs)(key, newObjects, logger); // This is a no-op for non-unique ID objects
    }
    /**
     * Populates fetch options with basic defaults for API requests.
     * @template T
     * @param {FetchParams<T>} params - Fetch parameters.
     * @returns {FetchParamsWithDefaults<T>} Fetch parameters with defaults filled in.
     */
    fillInDefaultParams(params) {
        const { cacheKey, logger, maxRecords } = params;
        const requestDefaults = config_1.config.api.data[cacheKey];
        const maxApiRecords = maxRecords || requestDefaults?.initialMaxRecords || config_1.MIN_RECORDS_FOR_FEATURE_SCORING;
        const withDefaults = {
            ...params,
            limit: Math.min(maxApiRecords, requestDefaults?.limit ?? config_1.config.api.defaultRecordsPerPage),
            logger: logger ?? this.loggerForParams(params),
            maxRecords: maxApiRecords,
            maxCacheRecords: requestDefaults?.maxCacheRecords,
        };
        return withDefaults;
    }
    /**
     * Returns a logger instance for the given fetch parameters.
     * @template T
     * @param {Omit<FetchParams<T>, "fetchGenerator">} params - Fetch parameters (excluding fetch).
     * @returns {Logger} Logger instance.
     */
    loggerForParams(params) {
        const { cacheKey, isBackgroundFetch, moar } = params;
        return getLogger(cacheKey, moar && "moar", isBackgroundFetch && "backgroundFetch");
    }
    /**
     * Returns true if the cache is fresh and we don't need to fetch more data.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {boolean} True if cached rows should be returned.
     */
    shouldReturnCachedRows(params) {
        const { cacheResult, moar } = params;
        return !!(cacheResult?.rows && !cacheResult.isStale && !moar);
    }
    /**
     * Validates that the fetch parameters are valid and work together.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     */
    validateFetchParams(params) {
        const { cacheKey, maxId, maxIdForFetch, minIdForFetch, moar, skipCache } = params;
        const logger = params.logger.tempLogger('validateFetchParams');
        if (moar && (skipCache || maxId)) {
            logger.warn(`skipCache=true AND moar or maxId set!`);
        }
        if (maxIdForFetch && minIdForFetch) {
            logger.logAndThrowError(`maxIdForFetch and minIdForFetch can't be used at same time!`, params);
        }
        // HASHTAG_TOOTS is a special case that doesn't use the cache and has no min/max ID that also spams logs
        if (cacheKey != enums_1.CacheKey.HASHTAG_TOOTS) {
            const paramsToLog = (0, collection_helpers_1.removeKeys)(params, PARAMS_TO_NOT_LOG, PARAMS_TO_NOT_LOG_IF_FALSE);
            if (paramsToLog.minIdForFetch) {
                logger.debug(`Incremental fetch from API to update stale cache:`, paramsToLog);
            }
            else if (paramsToLog.maxIdForFetch) {
                logger.debug(`Loading backwards from maxIdForFetch:`, paramsToLog);
            }
            else {
                logger.trace(`Fetching data from API or cache w/params:`, paramsToLog);
            }
        }
    }
    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////
    /**
     * Throws if the error is an access token revoked error, otherwise logs and moves on.
     * @param {Logger} logger - Logger instance.
     * @param {unknown} error - The error to check.
     * @param {string} msg - Message to log.
     * @throws {unknown} If the error is an access token revoked error.
     */
    static throwIfAccessTokenRevoked(logger, error, msg) {
        logger.error(`${msg}. Error:`, error);
        if (isAccessTokenRevokedError(error))
            throw error;
    }
    /**
     * Throws a sanitized rate limit error if detected, otherwise logs and throws the original error.
     * @param {unknown} error - The error to check.
     * @param {string} msg - Message to log.
     * @throws {string|unknown} Throws a user-friendly rate limit warning or the original error.
     */
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
/**
 * Returns true if the error is an access token revoked error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is an access token revoked error.
 */
function isAccessTokenRevokedError(e) {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }
    return e.message.includes(ACCESS_TOKEN_REVOKED_MSG);
}
exports.isAccessTokenRevokedError = isAccessTokenRevokedError;
;
/**
 * Returns true if the error is a rate limit error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is a rate limit error.
 */
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