/*
 * Singleton class to wrap authenticated mastodon API calls to the user's home server
 * (unauthenticated calls are handled by the MastodonServer class).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
import { mastodon } from "masto";
import { Mutex, Semaphore } from 'async-mutex';

import Account from "./objects/account";
import Toot, { SerializableToot, earliestTootedAt, mostRecentTootedAt, sortByCreatedAt } from './objects/toot';
import UserData from "./user_data";
import Storage, {
    STORAGE_KEYS_WITH_ACCOUNTS,
    STORAGE_KEYS_WITH_TOOTS,
    STORAGE_KEYS_WITH_UNIQUE_IDS,
    type CacheTimestamp,
} from "../Storage";
import { ageString, mostRecent, quotedISOFmt, subtractSeconds, timelineCutoffAt } from "../helpers/time_helpers";
import { CacheKey, buildCacheKeyDict, type ApiCacheKey } from "../enums";
import { config, MIN_RECORDS_FOR_FEATURE_SCORING } from "../config";
import { extractDomain } from '../helpers/string_helpers';
import { lockExecution, WaitTime } from '../helpers/log_helpers';
import { Logger } from '../helpers/logger';
import { repairTag } from "./objects/tag";
import { sleep } from "../helpers/time_helpers";
import { TrendingType } from '../enums';
import {
    findMinMaxId,
    getPromiseResults,
    removeKeys,
    sortObjsByCreatedAt,
    truncateToConfiguredLength,
    uniquifyByProp
} from "../helpers/collection_helpers";
import {
    type ConcurrencyLockRelease,
    type MastodonApiObject,
    type MastodonObjWithID,
    type MastodonTag,
    type MinMaxID,
    type StatusList,
    type TootLike,
    type WithCreatedAt,
} from "../types";

type ApiFetcher<T> = (params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>;

/**
 * Represents cached rows of API objects, including optional min/max ID information and cache timestamp.
 * @template T
 * @extends CacheTimestamp
 * @property {MinMaxID | null} [minMaxId] - The min/max ID in the cache if supported by the request.
 * @property {T[]} rows - Cached rows of API objects.
 */
interface CachedRows<T> extends CacheTimestamp {
    minMaxId?: MinMaxID | null;    // If the request supports min/max ID, the min/max ID in the cache
    rows: T[];                     // Cached rows of API objects
};

/**
 * Generic parameters for MastoApi methods that support backfilling via the "moar" flag.
 * @property {boolean} [bustCache] - If true, don't use cached data and update the cache with new data.
 * @property {Logger} [logger] - Optional logger to use for logging API calls.
 * @property {number} [maxRecords] - Optional max number of records to fetch.
 * @property {boolean} [moar] - If true, continue fetching from the max_id found in the cache.
 * @property {boolean} [skipCache] - If true, don't use cached data.
 */
export interface ApiParams {
    bustCache?: boolean,
    logger?: Logger,  // Optional logger to use for logging API calls
    maxRecords?: number,
    moar?: boolean,
    skipCache?: boolean,
};

/**
 * Parameters for endpoints that support a max_id parameter, extending ApiParams.
 * @extends ApiParams
 * @property {string | number | null} [maxId] - Optional maxId to use for pagination.
 */
interface ApiParamsWithMaxID extends ApiParams {
    maxId?: string | number | null,
};

/**
 * Parameters for fetching the home timeline, extending ApiParamsWithMaxID.
 * @extends ApiParamsWithMaxID
 * @property {(toots: Toot[], logger: Logger) => Promise<void>} mergeTootsToFeed - Function to merge fetched Toots into the main feed.
 */
interface HomeTimelineParams extends ApiParamsWithMaxID {
    mergeTootsToFeed: (toots: Toot[], logger: Logger) => Promise<void>,
};

/**
 * Parameters for fetching up to maxRecords pages of a user's data from the API.
 * @template T
 * @extends ApiParamsWithMaxID
 * @property {(pageOfResults: T[], allResults: T[]) => Promise<true | undefined>} [breakIf] - Function to check if more pages should be fetched.
 * @property {CacheKey} cacheKey - Cache key for storage.
 * @property {ApiFetcher<T>} [fetch] - Data fetching function to call with params.
 * @property {() => ApiFetcher<T>} [fetchGenerator] - Function to create a new iterator of the same type as fetch().
 * @property {boolean} [isBackgroundFetch] - Logging flag to indicate if this is a background fetch.
 * @property {(obj: T) => void} [processFxn] - Optional function to process the object before storing and returning it.
 * @property {boolean} [skipMutex] - If true, don't lock the endpoint mutex when making requests.
 */
interface FetchParams<T extends MastodonApiObject> extends ApiParamsWithMaxID {
    breakIf?: (pageOfResults: T[], allResults: T[]) => Promise<true | undefined>,
    cacheKey: CacheKey,
    fetch?: ApiFetcher<T>,
    fetchGenerator?: () => ApiFetcher<T>,
    isBackgroundFetch?: boolean,
    processFxn?: (obj: T) => void,
    skipMutex?: boolean,
};

/**
 * Parameters for background fetches, extending FetchParams.
 * @template T
 * @extends FetchParams<T>
 * @property {number} minRecords - Minimum number of records to fetch.
 */
interface BackgroundFetchparams<T extends MastodonApiObject> extends FetchParams<T> {
    minRecords: number,
};

/**
 * Same as FetchParams but all properties are required and 'limit' is added.
 * @template T
 * @extends FetchParams<T>
 * @property {number} limit - The limit for the API request.
 * @property {Logger} logger - Logger instance for logging.
 * @property {number} [maxCacheRecords] - Optional maximum number of records to keep in the cache.
 * @property {number} maxRecords - Maximum number of records to fetch.
 */
interface FetchParamsWithDefaults<T extends MastodonApiObject> extends FetchParams<T> {
    limit: number,
    logger: Logger,
    maxCacheRecords?: number,
    maxRecords: number,
};

/**
 * Parameters for min/max ID API requests.
 * @property {string | number | null} maxIdForFetch - The max ID to use for the API request.
 * @property {string | number | null} minIdForFetch - The min ID to use for the API request.
 */
interface MinMaxIDParams {
    maxIdForFetch: string | number | null,  // The max ID to use for the API request
    minIdForFetch: string | number | null,
};

/**
 * Same as FetchParams but with a few derived fields, including cache data and min/max ID params.
 * @template T
 * @extends FetchParamsWithDefaults<T>
 * @extends MinMaxIDParams
 * @property {CachedRows<T> | null} cacheResult - The cached result for the request, if any.
 */
interface FetchParamsWithCacheData<T extends MastodonApiObject> extends FetchParamsWithDefaults<T>, MinMaxIDParams {
    cacheResult: CachedRows<T> | null,
};

type FetchParamName = keyof FetchParamsWithCacheData<any>;

export const BIG_NUMBER = 10_000_000_000;
export const FULL_HISTORY_PARAMS = {maxRecords: BIG_NUMBER, moar: true};
// Error messages for MastoHttpError
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const RATE_LIMIT_ERROR_MSG = "Too many requests";  // MastoHttpError: Too many requests
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";
// Mutex locking and concurrency
const USER_DATA_MUTEX = new Mutex();  // For locking user data fetching
// Logging
const PARAMS_TO_NOT_LOG: FetchParamName[] = ["breakIf", "fetch", "logger", "processFxn"];
const PARAMS_TO_NOT_LOG_IF_FALSE: FetchParamName[] = ["skipCache", "skipMutex", "moar"];
// Loggers prefixed by [API]
const getLogger = Logger.logBuilder('API');
const apiLogger = getLogger();

/**
 * Singleton class for interacting with the authenticated Mastodon API for the user's home server.
 * Handles caching, concurrency, and provides methods for fetching and updating Mastodon data.
 */
export default class MastoApi {
    /** Singleton instance of MastoApi. */
    static #instance: MastoApi;

    /** Mastodon REST API client instance. */
    api: mastodon.rest.Client;
    /** Errors encountered while using the API. */
    apiErrors: Error[] = [];
    /** The Fedialgo user's home server domain. */
    homeDomain: string;
    /** API logger. */
    logger: Logger = getLogger();
    /** The Fedialgo user's Account object'. */
    user: Account;
    /** The Fedialgo user's historical info. */
    userData?: UserData;  // Save UserData in the API object to avoid polling local storage over and over
    /** Tracks the amount of time spent waiting for each endpoint's API responses. */
    waitTimes = buildCacheKeyDict(() => new WaitTime());

    private apiMutexes = buildCacheKeyDict(() => new Mutex());   // For locking data fetching for an API endpoint
    private cacheMutexes = buildCacheKeyDict(() => new Mutex()); // For locking checking the cache for an API endpoint
    private requestSemphore = new Semaphore(config.api.maxConcurrentHashtagRequests); // Concurrency of search & hashtag requests

    /**
     * Initializes the singleton MastoApi instance with the provided Mastodon API client and user account.
     * If an instance already exists, logs a warning and does nothing.
     * Loads user data from storage and assigns it to the instance.
     * @param {mastodon.rest.Client} api - The Mastodon REST API client.
     * @param {Account} user - The authenticated user account.
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    static async init(api: mastodon.rest.Client, user: Account): Promise<void> {
        if (MastoApi.#instance) {
            apiLogger.warn(`MastoApi instance already initialized...`);
            return;
        }

        apiLogger.log(`Initializing MastoApi instance with user:`, user.acct);
        MastoApi.#instance = new MastoApi(api, user);
        MastoApi.#instance.userData = await Storage.loadUserData();  // Instantiate userData from the cache
    }

    /**
     * Returns the singleton instance of MastoApi.
     * @returns {MastoApi}
     * @throws {Error} If the instance has not been initialized.
     */
    public static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }

    /**
     * Private constructor for MastoApi.
     * @param {mastodon.rest.Client} api - Mastodon REST API client.
     * @param {Account} user - The authenticated user account.
     */
    private constructor(api: mastodon.rest.Client, user: Account) {
        this.api = api;
        this.user = user;
        this.homeDomain = extractDomain(user.url);
        this.reset();
    }

    /**
     * Fetches the user's home timeline feed (recent toots from followed accounts and hashtags).
     * @param {HomeTimelineParams} params - Parameters for fetching the home feed.
     * @returns {Promise<Toot[]>} Array of Toots in the home feed.
     */
    async fetchHomeFeed(params: HomeTimelineParams): Promise<Toot[]> {
        let { maxId, maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = CacheKey.HOME_TIMELINE_TOOTS;
        const logger = this.loggerForParams({ ...params, cacheKey });
        const startedAt = new Date();

        let homeTimelineToots = await Storage.getCoerced<Toot>(cacheKey);
        let allNewToots: Toot[] = [];
        let cutoffAt = timelineCutoffAt();
        let oldestTootStr = "no oldest toot";

        if (moar) {
            const minMaxId = findMinMaxId(homeTimelineToots);
            if (minMaxId) maxId = minMaxId.min;  // Use the min ID in the cache as the maxId for the MOAR request
            logger.log(`Fetching more old toots (found min ID ${maxId})`);
        } else {
            // Look back additional lookbackForUpdatesMinutes minutes to catch new updates and edits to toots
            const maxTootedAt = mostRecentTootedAt(homeTimelineToots);
            const lookbackSeconds = config.api.data[cacheKey]?.lookbackForUpdatesMinutes! * 60;
            cutoffAt = maxTootedAt ? subtractSeconds(maxTootedAt, lookbackSeconds) : timelineCutoffAt();
            cutoffAt = mostRecent(timelineCutoffAt(), cutoffAt)!;
            logger.debug(`maxTootedAt: ${quotedISOFmt(maxTootedAt)}, maxId: ${maxId}, cutoffAt: ${quotedISOFmt(cutoffAt)}`);
        }

        // getApiRecords() returns Toots that haven't had completeProperties() called on them
        // which we don't use because breakIf() calls mergeTootsToFeed() on each page of results
        const _incompleteToots = await this.getApiObjsAndUpdate<mastodon.v1.Status>({
            fetch: this.api.v1.timelines.home.list,
            cacheKey: cacheKey,
            maxId: maxId,
            maxRecords: maxRecords,
            skipCache: true,  // Home timeline manages its own cache state via breakIf()
            skipMutex: true,
            breakIf: async (newStatuses: StatusList, allStatuses: StatusList) => {
                const oldestTootAt = earliestTootedAt(newStatuses);

                if (!oldestTootAt) {
                    logger.warn(`No new statuses in page of ${newStatuses.length} toots, halting`);
                    return true;
                }

                oldestTootStr = `oldest toot: ${quotedISOFmt(oldestTootAt)}`;
                logger.debug(`Got ${newStatuses.length} new toots, ${allStatuses.length} total (${oldestTootStr})`);
                const newToots = await Toot.buildToots(newStatuses, cacheKey);
                await mergeTootsToFeed(newToots, logger);
                allNewToots = allNewToots.concat(newToots)

                // Break the toot fetching loop if we encounter a toot older than cutoffAt
                if (oldestTootAt < cutoffAt) {
                    logger.log(`Halting fetch (${oldestTootStr} <= cutoff ${quotedISOFmt(cutoffAt)})`);
                    return true;
                }
            }
        }) as Toot[];

        homeTimelineToots = Toot.dedupeToots([...allNewToots, ...homeTimelineToots], logger)
        let msg = `Fetched ${allNewToots.length} new toots ${ageString(startedAt)} (${oldestTootStr}`;
        logger.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        homeTimelineToots = sortByCreatedAt(homeTimelineToots).reverse(); // TODO: should we sort by score?
        homeTimelineToots = truncateToConfiguredLength(homeTimelineToots, config.toots.maxTimelineLength, logger);
        await Storage.set(cacheKey, homeTimelineToots);
        return homeTimelineToots;
    }

    /**
     * Gets the accounts blocked by the user (does not include muted accounts).
     * @returns {Promise<Account[]>} Array of blocked accounts.
     */
    async getBlockedAccounts(): Promise<Account[]> {
        const blockedAccounts = await this.getApiObjsAndUpdate<mastodon.v1.Account>({
            fetch: this.api.v1.blocks.list,
            cacheKey: CacheKey.BLOCKED_ACCOUNTS
        }) as Account[];

        Account.logSuspendedAccounts(blockedAccounts, CacheKey.BLOCKED_ACCOUNTS);
        return blockedAccounts;
    }

    /**
     * Generic data getter for cacheable toots with custom fetch logic.
     * Used for various hashtag feeds (participated, trending, favourited).
     * @param {() => Promise<TootLike[]>} fetchStatuses - Function to fetch statuses.
     * @param {ApiCacheKey} cacheKey - Cache key for storage.
     * @param {number} maxRecords - Maximum number of records to fetch.
     * @returns {Promise<Toot[]>} Array of Toots.
     */
    async getCacheableToots(
        fetchStatuses: () => Promise<TootLike[]>,
        cacheKey: ApiCacheKey,
        maxRecords: number,
    ): Promise<Toot[]> {
        const logger = getLogger(cacheKey);
        const releaseMutex = await lockExecution(this.apiMutexes[cacheKey], logger);
        this.waitTimes[cacheKey].markStart();  // Telemetry stuff that should be removed eventually

        try {
            let toots = await Storage.getIfNotStale<Toot[]>(cacheKey);

            if (!toots) {
                const statuses = await fetchStatuses();
                logger.trace(`Retrieved ${statuses.length} Toots ${this.waitTimes[cacheKey].ageString()}`);
                toots = await Toot.buildToots(statuses, cacheKey);
                toots = truncateToConfiguredLength(toots, maxRecords, logger);
                await Storage.set(cacheKey, toots);
            }

            return toots;
        } catch (err) {
            // TODO: the hacky cast is because ApiCacheKey is broader than CacheKey
            this.handleApiError({ cacheKey: cacheKey as CacheKey, logger }, [], err);
            return [];
        } finally {
            releaseMutex();
        }
    }

    /**
     * Gets the toots recently favourited by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Toot[]>} Array of favourited Toots.
     */
    async getFavouritedToots(params?: ApiParams): Promise<Toot[]> {
        return await this.getApiObjsAndUpdate<mastodon.v1.Status>({
            fetch: this.api.v1.favourites.list,
            cacheKey: CacheKey.FAVOURITED_TOOTS,
            ...(params || {})
        }) as Toot[];
    }

    /**
     * Gets the accounts followed by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of followed accounts.
     */
    async getFollowedAccounts(params?: ApiParams): Promise<Account[]> {
        return await this.getWithBackgroundFetch<mastodon.v1.Account>({
            fetchGenerator: () => this.api.v1.accounts.$select(this.user.id).following.list,
            cacheKey: CacheKey.FOLLOWED_ACCOUNTS,
            minRecords: this.user.followingCount - 10, // We want to get at least this many followed accounts
            processFxn: (account) => (account as Account).isFollowed = true,
            ...(params || {})
        }) as Account[];
    }

    /**
     * Gets the hashtags followed by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<mastodon.v1.Tag[]>} Array of followed tags.
     */
    async getFollowedTags(params?: ApiParams): Promise<mastodon.v1.Tag[]> {
        return await this.getApiObjsAndUpdate<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            cacheKey: CacheKey.FOLLOWED_TAGS,
            processFxn: (tag) => repairTag(tag),
            ...(params || {})
        }) as mastodon.v1.Tag[];
    }

    /**
     * Gets the followers of the Fedialgo user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of follower accounts.
     */
    async getFollowers(params?: ApiParams): Promise<Account[]> {
        return await this.getWithBackgroundFetch<mastodon.v1.Account>({
            fetchGenerator: () => this.api.v1.accounts.$select(this.user.id).followers.list,
            cacheKey: CacheKey.FOLLOWERS,
            minRecords: this.user.followersCount - 10, // We want to get at least this many followed accounts
            processFxn: (account) => (account as Account).isFollower = true,
            ...(params || {})
        }) as Account[];
    }

    /**
     * Gets all muted accounts (including fully blocked accounts).
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of muted and blocked accounts.
     */
    async getMutedAccounts(params?: ApiParams): Promise<Account[]> {
        const mutedAccounts = await this.getApiObjsAndUpdate<mastodon.v1.Account>({
            fetch: this.api.v1.mutes.list,
            cacheKey: CacheKey.MUTED_ACCOUNTS,
            ...(params || {})
        }) as Account[];

        Account.logSuspendedAccounts(mutedAccounts, CacheKey.MUTED_ACCOUNTS);
        return mutedAccounts.concat(await this.getBlockedAccounts());
    }

    /**
     * Gets the user's recent notifications.
     * @param {ApiParamsWithMaxID} [params] - Optional parameters.
     * @returns {Promise<mastodon.v1.Notification[]>} Array of notifications.
     */
    async getNotifications(params?: ApiParamsWithMaxID): Promise<mastodon.v1.Notification[]> {
        const notifs = await this.getApiObjsAndUpdate<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            cacheKey: CacheKey.NOTIFICATIONS,
            ...(params || {})
        }) as mastodon.v1.Notification[];

        this.logger.log(`[${CacheKey.NOTIFICATIONS}] getNotifications() retrieved ${notifs.length} notifications:`);
        return notifs;
    }

    /**
     * Gets the user's recent toots.
     * @param {ApiParamsWithMaxID} [params] - Optional parameters.
     * @returns {Promise<Toot[]>} Array of recent user Toots.
     */
    async getRecentUserToots(params?: ApiParamsWithMaxID): Promise<Toot[]> {
        return await this.getApiObjsAndUpdate<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            cacheKey: CacheKey.RECENT_USER_TOOTS,
            ...(params || {})
        }) as Toot[];
    }

    /**
     * Retrieves content-based feed filters set up by the user on the server.
     * @returns {Promise<mastodon.v2.Filter[]>} Array of server-side filters.
     */
    async getServerSideFilters(): Promise<mastodon.v2.Filter[]> {
        const logger = getLogger(CacheKey.SERVER_SIDE_FILTERS);
        const releaseMutex = await lockExecution(this.apiMutexes[CacheKey.SERVER_SIDE_FILTERS], logger);
        const startTime = new Date();

        try {
            let filters = await Storage.getIfNotStale<mastodon.v2.Filter[]>(CacheKey.SERVER_SIDE_FILTERS);

            if (!filters){
                filters = await this.api.v2.filters.list();

                // Filter out filters that either are just warnings or don't apply to the home context
                filters = filters.filter(filter => {
                    // Before Mastodon 4.0 Filter objects lacked a 'context' property altogether
                    if (filter.context?.length > 0 && !filter.context.includes("home")) return false;
                    if (filter.filterAction != "hide") return false;
                    return true;
                });

                logger.log(`Retrieved ${filters.length} filters ${ageString(startTime)}:`, filters);
                await Storage.set(CacheKey.SERVER_SIDE_FILTERS, filters);
            }

            return filters;
        } finally {
            releaseMutex();
        }
    };

    /**
     * Gets the latest toots for a given tag using both the Search API and tag timeline API.
     * The two APIs give results with surprisingly little overlap (~80% of toots are unique).
     * @param {string} tagName - The tag to search for.
     * @param {Logger} logger - Logger instance for logging.
     * @param {number} [numToots] - Number of toots to fetch.
     * @returns {Promise<TootLike[]>} Array of TootLike objects.
     */
    async getStatusesForTag(tagName: string, logger: Logger, numToots?: number): Promise<TootLike[]> {
        numToots ||= config.trending.tags.numTootsPerTag;
        const startedAt = new Date();

        const results = await getPromiseResults<TootLike[]>([
            this.searchForToots(tagName, logger.tempLogger('search'), numToots),
            this.hashtagTimelineToots(tagName, logger.tempLogger('timeline'), numToots),
        ]);

        if (results.rejectedReasons.length) {
            const accessRevokedError = results.rejectedReasons.find(e => isAccessTokenRevokedError(e));

            if (accessRevokedError) {
                throw accessRevokedError;
            } else {
                this.apiErrors.push(new Error(`Error getting toots for "#${tagName}"`, {cause: results.rejectedReasons}));
            }
        }

        const toots = results.fulfilled.flat();
        let msg = `search endpoint got ${results.fulfilled[0]?.length || 0} toots, ` +
                  `hashtag timeline got ${results.fulfilled[1]?.length || 0} ` +
                  `${ageString(startedAt)} (total ${toots.length}, oldest=${quotedISOFmt(earliestTootedAt(toots))}`;
        logger.trace(`${msg}, newest=${quotedISOFmt(mostRecentTootedAt(toots))})`);
        return toots;
    }

    /**
     * Retrieves background data about the user for scoring, etc. Caches as an instance variable.
     * @param {boolean} [force] - If true, forces a refresh from the API.
     * @returns {Promise<UserData>} The user data object.
     */
    async getUserData(force?: boolean): Promise<UserData> {
        const releaseMutex = await lockExecution(USER_DATA_MUTEX, this.logger);

        try {
            if (force || !this.userData?.hasNewestApiData()) {
                this.userData = await UserData.build();
            }

            return this.userData;
        } finally {
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
    async hashtagTimelineToots(tagName: string, logger: Logger, maxRecords?: number): Promise<Toot[]> {
        maxRecords = maxRecords || config.api.defaultRecordsPerPage;
        const releaseSemaphore = await lockExecution(this.requestSemphore, logger);
        const startedAt = new Date();

        try {
            const toots = await this.getApiObjsAndUpdate<mastodon.v1.Status>({
                fetch: this.api.v1.timelines.tag.$select(tagName).list,
                cacheKey: CacheKey.HASHTAG_TOOTS,  // This CacheKey is just for log prefixes + signaling how to serialize
                logger,
                maxRecords,
                // hashtag timeline toots are not cached as a group, they're pulled in small amounts and used
                // to create other sets of toots from a lot of small requests, e.g. PARTICIPATED_TAG_TOOTS
                skipCache: true,
                // Concurrency is managed by the semaphore above, not the mutexes
                skipMutex: true,
            });

            logger.deep(`Retrieved ${toots.length} toots ${ageString(startedAt)}`);
            return toots as Toot[];
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(logger, e, `Failed ${ageString(startedAt)}`);
            throw (e);
        } finally {
            releaseSemaphore();
        }
    }

    /**
     * Retrieves the user's home instance (mastodon server) configuration from the API.
     * @returns {Promise<mastodon.v2.Instance>} The instance configuration.
     */
    async instanceInfo(): Promise<mastodon.v2.Instance> {
        try {
            return await this.api.v2.instance.fetch();
        } catch (err) {
            this.logger.error(`<instanceInfo()> Failed to fetch user's instance info, trying V1 API:`, err);
            const v1Instance = await this.api.v1.instance.fetch();

            if (v1Instance) {
                let msg = `V2 instanceInfo() not available but v1 instance info exists. Unfortunately I will now discard it.`;
                this.logger.logAndThrowError(msg, v1Instance);
            } else {
                this.logger.logAndThrowError(`Failed to fetch Mastodon instance info from both V1 and V2 APIs`, err);
            }
        }
    }

    /**
     * Locks all API and cache mutexes for cache state operations.
     * @returns {Promise<ConcurrencyLockRelease[]>} Array of lock release functions.
     */
    async lockAllMutexes(): Promise<ConcurrencyLockRelease[]> {
        const allMutexes = Object.values(this.apiMutexes).concat(Object.values(this.cacheMutexes));
        const mutexLogger = apiLogger.tempLogger('lockAllMutexes');
        mutexLogger.log(`Locking all mutexes...`);
        return await Promise.all(allMutexes.map(mutex => lockExecution(mutex, mutexLogger)));
    };

    /**
     * Resolves a foreign server toot URI to one on the user's local server using the v2 search API.
     * transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
     *                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
     * @param {Toot} toot - The toot to resolve.
     * @returns {Promise<Toot>} The resolved toot.
     */
    async resolveToot(toot: Toot): Promise<Toot> {
        const logger = getLogger('resolveToot()', toot.realURI);
        logger.trace(`called for`, toot);
        const tootURI = toot.realURI;
        const urlDomain = extractDomain(tootURI);
        if (urlDomain == this.homeDomain) return toot;
        const lookupResult = await this.api.v2.search.list({q: tootURI, resolve: true});

        if (!lookupResult?.statuses?.length) {
            logger.logAndThrowError(`Got bad result for "${tootURI}"`, lookupResult);
        }

        const resolvedStatus = lookupResult.statuses[0];
        logger.trace(`found resolvedStatus for "${tootURI}":`, resolvedStatus);
        return Toot.build(resolvedStatus as mastodon.v1.Status);
    }

    /**
     * Performs a keyword substring search for toots using the search API.
     * @param {string} searchStr - The string to search for.
     * @param {Logger} logger - Logger instance for logging.
     * @param {number} [maxRecords] - Maximum number of records to fetch.
     * @returns {Promise<mastodon.v1.Status[]>} Array of status objects.
     */
    async searchForToots(searchStr: string, logger: Logger, maxRecords?: number): Promise<mastodon.v1.Status[]> {
        maxRecords = maxRecords || config.api.defaultRecordsPerPage;
        const releaseSemaphore = await lockExecution(this.requestSemphore, logger);
        const query: mastodon.rest.v1.SearchParams = {limit: maxRecords, q: searchStr, type: TrendingType.STATUSES};
        const startedAt = new Date();

        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            logger.deep(`Retrieved ${statuses.length} toots ${ageString(startedAt)}`);
            return statuses;
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(logger, e, `Failed ${ageString(startedAt)}`);
            throw (e);
        } finally {
            releaseSemaphore();
        }
    }

    /**
     * Resets the API state, clearing errors and user data, and resetting concurrency.
     */
    reset(): void {
        this.apiErrors = [];
        this.userData = undefined;  // Clear the user data cache
        this.setSemaphoreConcurrency(config.api.maxConcurrentHashtagRequests);
    };

    /**
     * Sets the concurrency for the request semaphore.
     * @param {number} concurrency - The new concurrency value.
     */
    setSemaphoreConcurrency(concurrency: number): void {
        this.logger.log(`Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new Semaphore(concurrency);
    }

    /**
     * Returns the URL for a tag on the user's home server.
     * @param {MastodonTag | string} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    tagUrl(tag: MastodonTag | string) {
        return `${this.endpointURL(TrendingType.TAGS)}/${typeof tag == "string" ? tag : tag.name}`;
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
    private endpointURL = (endpoint: string) => `https://${this.homeDomain}/${endpoint}`;
    /**
     * Checks if the config supports min/max ID for a given cache key.
     * @private
     * @param {CacheKey} cacheKey - The cache key.
     * @returns {boolean} True if min/max ID is supported.
     */
    private supportsMinMaxId = (cacheKey: CacheKey) => !!config.api.data[cacheKey]?.supportsMinMaxId;

    /**
     * Pure fetch of API records, no caching or background updates.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {Promise<MastodonApiObject[]>} Array of API objects.
     */
    private async fetchApiObjs<T extends MastodonApiObject>(
        params: FetchParamsWithCacheData<T>
    ): Promise<MastodonApiObject[]> {
        this.validateFetchParams<T>(params);
        let { breakIf, cacheKey, fetch, fetchGenerator, isBackgroundFetch, logger, maxRecords } = params;

        // Create a new Iterator for the fetch if fetchGenerator is provided
        fetch = fetchGenerator ? fetchGenerator() : fetch;
        const waitTime = this.waitTimes[cacheKey];
        waitTime.markStart();  // Telemetry
        let newRows: T[] = [];
        let pageNumber = 0;

        try {
            for await (const page of fetch!(this.buildParams(params))) {
                waitTime.markEnd(); // telemetry
                newRows = newRows.concat(page as T[]);

                // breakIf() must be called before we check the length of rows!  // TODO: still necessary?
                const shouldStop = breakIf ? (await breakIf(page, newRows)) : false;
                let resultsMsg = `fetched ${page.length} in page ${++pageNumber}, ${newRows.length} records so far`;
                resultsMsg += ` ${waitTime.ageString()}`;

                if (newRows.length >= maxRecords || page.length == 0 || shouldStop) {
                    logger.debug(`Fetch finished (${resultsMsg}, shouldStop=${shouldStop}, maxRecords=${maxRecords})`);
                    break;
                } else if (waitTime.ageInSeconds() > config.api.maxSecondsPerPage) {
                    logger.logAndThrowError(`Request took too long! (${waitTime.ageInSeconds()}s), ${resultsMsg}`)
                } else {
                    (pageNumber % 5 == 0) ? logger.debug(resultsMsg) : logger.trace(resultsMsg);
                }

                if (isBackgroundFetch) {
                    logger.trace(`Background fetch, sleeping for ${config.api.backgroundLoadSleepBetweenRequestsMS / 1000}s`);
                    await sleep(config.api.backgroundLoadSleepBetweenRequestsMS);
                }

                waitTime.markStart();  // Reset timer for next page
            }

            return newRows;
        } catch (e) {
            return this.handleApiError<T>(params, newRows, e);
        }
    }

    /**
     * Returns cached rows immediately if they exist, triggers background update if stale.
     * @private
     * @template T
     * @param {FetchParams<T>} inParams - Fetch parameters.
     * @returns {Promise<MastodonApiObject[]>} Array of API objects.
     */
    private async getApiObjsAndUpdate<T extends MastodonApiObject>(
        inParams: FetchParams<T>
    ): Promise<MastodonApiObject[]> {
        const paramsWithCache = await this.addCacheDataToParams<T>(inParams);
        let { cacheKey, cacheResult, logger, moar, skipMutex } = paramsWithCache;
        const hereLogger = logger.tempLogger('getApiObjsAndUpdate');
        const releaseMutex = skipMutex ? null : await lockExecution(this.cacheMutexes[cacheKey], hereLogger);

        try {
            // TODO: maybe check that there's more than 0 rows in the cache before returning them?
            // "moar" data requests are aleady running in their own background job so can afford to wait
            if (cacheResult && !moar) {
                if (cacheResult.isStale) {
                    // If the mutex is locked background load is in progress so don't start another one
                    if (this.apiMutexes[cacheKey].isLocked()) {
                        hereLogger.trace(`Stale cache but update already in progress, returning stale rows`);
                    }  else {
                        hereLogger.debug(`Returning ${cacheResult.rows.length} stale rows and triggering cache update`);
                        this.getApiObjs<T>({...paramsWithCache, isBackgroundFetch: true});
                    }
                }

                return cacheResult.rows;
            } else {
                return await this.getApiObjs<T>(paramsWithCache);
            }
        } finally {
            releaseMutex?.();
        }
    }

    /**
     * Generic Mastodon API fetcher. Uses cache if possible, fetches from API if cache is empty or stale.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {Promise<MastodonApiObject[]>} Array of API objects.
     */
    private async getApiObjs<T extends MastodonApiObject>(
        params: FetchParamsWithCacheData<T>
    ): Promise<MastodonApiObject[]> {
        let { cacheKey, isBackgroundFetch, logger, maxCacheRecords, processFxn, skipCache, skipMutex } = params;
        logger = logger.tempLogger('getApiObjs');
        params = { ...params, logger };

        if (this.apiMutexes[cacheKey].isLocked()) {
            if (isBackgroundFetch) {
                logger.trace(`Called but mutex already locked (background load in progress, nothing to do)`);
            } else {
                logger.error(`ApiMutex is already locked but shouldn't be! Returning empty array...`);
            }

            return [];
        }

        const releaseMutex = skipMutex ? null : await lockExecution(this.apiMutexes[cacheKey], logger);

        try {
            // Check the cache again, in case it was updated while we were waiting for the mutex
            params.cacheResult = await this.getCacheResult<T>(params);
            const cachedRows = params.cacheResult?.rows || [];

            if (this.shouldReturnCachedRows(params)) {
                logger.trace(`Returning ${cachedRows.length} cached rows`);
                return cachedRows;
            }

            let newRows = await this.fetchApiObjs<T>(params) as T[];

            // If endpoint has unique IDs use both cached and new rows (it's deduped in buildFromApiObjects())
            // newRows are in front so they will survive truncation (if it happens)
            if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
                newRows = [...newRows, ...cachedRows];
            }

            const objs = this.buildFromApiObjects(cacheKey, newRows, logger);

            // If we have a maxCacheRecords limit, truncate the new rows to that limit
            if (maxCacheRecords && objs.length > maxCacheRecords) {
                logger.warn(`Truncating ${objs.length} rows to maxCacheRecords=${maxCacheRecords}`);
                // TODO: there's a Mastodon object w/out created_at, so this would break but for now that object has no maxCacheRecords set for that endpoint
                newRows = truncateToConfiguredLength(sortObjsByCreatedAt(objs as WithCreatedAt[]), maxCacheRecords, logger);
            }

            if (processFxn) objs.forEach(obj => obj && processFxn!(obj as T));
            if (!skipCache) await Storage.set(cacheKey, objs);
            return objs;
        } catch (err) {
            logger.error(`Error fetching API records for ${cacheKey} where there really shouldn't be!`, err);
            return [];
        } finally {
            releaseMutex?.();
        }
    }

    /**
     * Gets maxRecords, and if not more than minRecords, launches a background fetch.
     * @private
     * @template T
     * @param {BackgroundFetchparams<T>} params - Background fetch parameters.
     * @returns {Promise<T[]>} Array of API objects.
     */
    private async getWithBackgroundFetch<T extends MastodonApiObject>(
        params: BackgroundFetchparams<T>
    ): Promise<T[]> {
        const { minRecords } = params;
        const logger = this.loggerForParams(params).tempLogger('getWithBackgroundFetch');
        if (!params.fetchGenerator) logger.logAndThrowError(`Missing fetchGenerator!`, params);
        logger.trace(`Called with minRecords ${minRecords}`);
        const objs = await this.getApiObjsAndUpdate<T>(params) as T[];

        if (objs.length < minRecords) {
            logger.log(`Fewer rows (${objs.length}) than required (${minRecords}), launching bg job to get the rest`);

            // TODO: can't import the ScorerCache here because it would create a circular dependency
            this.getApiObjsAndUpdate<T>({...FULL_HISTORY_PARAMS, ...params, isBackgroundFetch: true})
                // .then(() => ScorerCache.prepareScorers(true))  // Force ScorerCache to update
        } else {
            logger.trace(`Have enough rows (have ${objs.length}, want ${minRecords}), doing nothing`);
        }

        return objs;
    }

    /**
     * Builds API request parameters for pagination.
     * @private
     * @param {FetchParamsWithCacheData<any>} params - Fetch parameters with cache data.
     * @returns {mastodon.DefaultPaginationParams} API pagination parameters.
     */
    private buildParams(params: FetchParamsWithCacheData<any>): mastodon.DefaultPaginationParams {
        const { limit, minIdForFetch, maxIdForFetch } = params;
        let apiParams: mastodon.DefaultPaginationParams = { limit };
        if (minIdForFetch) apiParams = {...apiParams, minId: `${minIdForFetch}`};
        if (maxIdForFetch) apiParams = {...apiParams, maxId: `${maxIdForFetch}`};
        return apiParams;
    }

    /**
     * Fills in defaults in params and derives min/maxIdForFetch from cached data if appropriate.
     * @private
     * @template T
     * @param {FetchParams<T>} inParams - Fetch parameters.
     * @returns {Promise<FetchParamsWithCacheData<T>>} Completed fetch parameters with cache data.
     */
    private async addCacheDataToParams<T extends MastodonApiObject>(
        inParams: FetchParams<T>
    ): Promise<FetchParamsWithCacheData<T>> {
        const params = this.fillInDefaultParams<T>(inParams);
        let { logger, maxId, maxRecords, moar } = params;
        const cacheResult = await this.getCacheResult<T>(params);
        const minMaxIdParams: MinMaxIDParams = {maxIdForFetch: null, minIdForFetch: null};

        // If min/maxId is supported then we find the min/max ID in the cached data to use in the next request
        // If we're pulling "moar" old data, use the min ID of the cache as the request maxId
        // If we're incrementally updating stale data, use the max ID of the cache as the request minId
        if (cacheResult?.minMaxId) {
            if (moar) {
                if (maxId) logger.warn(`maxId param "${maxId}" will overload minID in cache "${cacheResult.minMaxId.min}"!`);
                minMaxIdParams.maxIdForFetch = maxId || cacheResult.minMaxId.min;
            } else {
                minMaxIdParams.minIdForFetch = cacheResult.minMaxId.max;
            }
        } else if (maxId) {
            logger.info(`Loading backward from manually provided maxId: "${maxId}"`);
            minMaxIdParams.maxIdForFetch = maxId;  // If we have a manually provided maxId use it as the maxIdForFetch
        }

        // If 'moar' flag is set, add another unit of maxRecords to the row count we have now
        if (cacheResult && moar) {
            maxRecords = maxRecords! + cacheResult.rows!.length;
            logger.info(`Increasing maxRecords for MOAR_DATA to ${maxRecords}`);
        }

        const completedParams: FetchParamsWithCacheData<T> = {
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
     * @returns {Promise<CachedRows<T> | null>} Cached rows or null.
     */
    private async getCacheResult<T extends MastodonApiObject>(
        params: FetchParamsWithDefaults<T>
    ): Promise<CachedRows<T> | null> {
        const { bustCache, cacheKey, skipCache } = params;
        if (bustCache || skipCache) return null;
        const cachedData = await Storage.getWithStaleness(cacheKey);
        if (!cachedData) return null;
        const rows = cachedData?.obj as T[];

        // NOTE: Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
        // or future. For a while we used a small offset to the list of toots sorted by created_at instead
        // of the actual min/max.
        return {
            isStale: cachedData.isStale,
            // minMaxId is not returned  if endpoint doesn't support min/max ID API requests (even if it exists)
            minMaxId: this.supportsMinMaxId(cacheKey) ? findMinMaxId(rows as MastodonObjWithID[]) : null,
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
     * @param {T[]} rows - Rows fetched so far.
     * @param {Error | unknown} err - The error encountered.
     * @returns {T[]} Array of rows to use.
     */
    private handleApiError<T extends MastodonApiObject>(
        params: Partial<FetchParamsWithCacheData<T>>,
        rows: T[],
        err: Error | unknown,
    ): T[] {
        let { cacheKey, cacheResult, logger } = params;
        cacheKey ??= CacheKey.HOME_TIMELINE_TOOTS;  // TODO: this is a hack to avoid undefined cacheKey
        logger ??= getLogger(cacheKey, 'handleApiError');
        const startedAt = this.waitTimes[cacheKey].startedAt || Date.now();
        const cachedRows = cacheResult?.rows || [];
        let msg = `"${err} After pulling ${rows.length} rows (cache: ${cachedRows.length} rows).`;
        this.apiErrors.push(new Error(logger.line(msg), {cause: err}));
        MastoApi.throwIfAccessTokenRevoked(logger, err, `Failed ${ageString(startedAt)}. ${msg}`);

        // If endpoint doesn't support min/max ID and we have less rows than we started with use old rows
        if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
            logger.warn(`${msg} Merging cached rows with new rows based on ID`);
            return [...cachedRows, ...rows];
        } else if (!cacheResult?.minMaxId) {
            msg += ` Query didn't use incremental min/max ID.`;

            if (rows.length < cachedRows.length) {
                logger.warn(`${msg} Discarding new rows and returning old ones bc there's more of them.`);
                return cachedRows;
            } else {
                logger.warn(`${msg} Keeping the new rows, discarding cached rows bc there's fewer of them.`);
                return rows;
            }
        } else {
            logger.error(`Shouldn't be here! All endpoints either support min/max ID or unique IDs: ${msg}`);
            return rows;
        }
    }

    /**
     * Constructs Account or Toot objects from API objects, or returns the object as-is.
     * @private
     * @param {CacheKey} key - The cache key.
     * @param {MastodonApiObject[]} objects - Array of API objects.
     * @param {Logger} logger - Logger instance.
     * @returns {MastodonApiObject[]} Array of constructed objects.
     */
    private buildFromApiObjects(key: CacheKey, objects: MastodonApiObject[], logger: Logger): MastodonApiObject[] {
        if (STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            const accounts = objects.map(o => Account.build(o as mastodon.v1.Account));
            return uniquifyByProp<MastodonObjWithID>(accounts, (obj) => obj.id, key);
        } else if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            const toots = objects.map(obj => obj instanceof Toot ? obj : Toot.build(obj as SerializableToot));
            return Toot.dedupeToots(toots, logger.tempLogger(`buildFromApiObjects`));
        } else if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(key)) {
            return uniquifyByProp<MastodonObjWithID>(objects as MastodonObjWithID[], (obj) => obj.id, key);
        } else {
            return objects;
        }
    }

    /**
     * Populates fetch options with basic defaults for API requests.
     * @template T
     * @param {FetchParams<T>} params - Fetch parameters.
     * @returns {FetchParamsWithDefaults<T>} Fetch parameters with defaults filled in.
     */
    private fillInDefaultParams<T extends MastodonApiObject>(params: FetchParams<T>): FetchParamsWithDefaults<T> {
        let { cacheKey, logger, maxRecords } = params;
        const requestDefaults = config.api.data[cacheKey];
        const maxApiRecords = maxRecords || requestDefaults?.initialMaxRecords || MIN_RECORDS_FOR_FEATURE_SCORING;

        const withDefaults: FetchParamsWithDefaults<T> = {
            ...params,
            limit: Math.min(maxApiRecords, requestDefaults?.limit ?? config.api.defaultRecordsPerPage),
            logger: logger || this.loggerForParams(params),
            maxRecords: maxApiRecords,
            maxCacheRecords: requestDefaults?.maxCacheRecords,
        };

        return withDefaults;
    }

    /**
     * Returns a logger instance for the given fetch parameters.
     * @template T
     * @param {Omit<FetchParams<T>, "fetch">} params - Fetch parameters (excluding fetch).
     * @returns {Logger} Logger instance.
     */
    private loggerForParams<T extends MastodonApiObject>(params: Omit<FetchParams<T>, "fetch">): Logger {
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
    private shouldReturnCachedRows<T extends MastodonApiObject>(params: FetchParamsWithCacheData<T>) {
        const { cacheResult, moar } = params;
        return cacheResult?.rows && !cacheResult.isStale && !moar;
    }

    /**
     * Validates that the fetch parameters are valid and work together.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     */
    private validateFetchParams<T extends MastodonApiObject>(params: FetchParamsWithCacheData<T>): void {
        let { cacheKey, fetch, fetchGenerator, logger, maxId, maxIdForFetch, minIdForFetch, moar, skipCache } = params;
        logger = logger.tempLogger('validateFetchParams');

        if (!(fetch || fetchGenerator)) {
            logger.logAndThrowError(`No fetch or fetchGenerator provided for ${cacheKey}`, params);
        } else if (fetch && fetchGenerator) {
            logger.logAndThrowError(`Both fetch and fetchGenerator provided for ${cacheKey}`, params);
        }

        if (moar && (skipCache || maxId)) {
            logger.warn(`skipCache=true AND moar or maxId set!`);
        }

        if (maxIdForFetch && minIdForFetch) {
            logger.logAndThrowError(`maxIdForFetch and minIdForFetch can't be used at same time!`, params);
        }

        // HASHTAG_TOOTS is a special case that doesn't use the cache and has no min/max ID that also spams logs
        if (cacheKey != CacheKey.HASHTAG_TOOTS) {
            const paramsToLog = removeKeys(params, PARAMS_TO_NOT_LOG, PARAMS_TO_NOT_LOG_IF_FALSE);

            if (paramsToLog.minIdForFetch ) {
                logger.debug(`Incremental fetch from API to update stale cache:`, paramsToLog);
            } else if (paramsToLog.maxIdForFetch) {
                logger.debug(`Loading backwards from maxIdForFetch:`, paramsToLog);
            } else {
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
    static throwIfAccessTokenRevoked(logger: Logger, error: unknown, msg: string): void {
        logger.error(`${msg}. Error:`, error);
        if (isAccessTokenRevokedError(error)) throw error;
    }

    /**
     * Throws a sanitized rate limit error if detected, otherwise logs and throws the original error.
     * @param {unknown} error - The error to check.
     * @param {string} msg - Message to log.
     * @throws {string|unknown} Throws a user-friendly rate limit warning or the original error.
     */
    static throwSanitizedRateLimitError(error: unknown, msg: string): void {
        if (isRateLimitError(error)) {
            apiLogger.error(`Rate limit error:`, error);
            throw RATE_LIMIT_USER_WARNING;
        } else {
            apiLogger.logAndThrowError(msg, error);
        }
    }
};


/**
 * Returns true if the error is an access token revoked error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is an access token revoked error.
 */
export function isAccessTokenRevokedError(e: Error | unknown): boolean {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }

    return e.message.includes(ACCESS_TOKEN_REVOKED_MSG);
};


/**
 * Returns true if the error is a rate limit error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is a rate limit error.
 */
export function isRateLimitError(e: Error | unknown): boolean {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }

    return e.message.includes(RATE_LIMIT_ERROR_MSG);
};
