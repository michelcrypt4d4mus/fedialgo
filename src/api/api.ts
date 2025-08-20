/*
 * Singleton class to wrap authenticated mastodon API calls to the user's home server
 * (unauthenticated calls are handled by the MastodonServer class).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
import { isNil } from "lodash";
import { mastodon } from "masto";
import { Mutex, Semaphore } from 'async-mutex';

import Account from "./objects/account";
import Storage from "../Storage";
import Toot, { earliestTootedAt, mostRecentTootedAt, sortByCreatedAt } from './objects/toot';
import UserData from "./user_data";
import { config, MIN_RECORDS_FOR_FEATURE_SCORING } from "../config";
import { extractDomain } from '../helpers/string_helpers';
import { lockExecution } from '../helpers/mutex_helpers';
import { Logger } from '../helpers/logger';
import { repairTag } from "./objects/tag";
import { sleep } from "../helpers/time_helpers";
import { isAccessTokenRevokedError, throwIfAccessTokenRevoked } from "./errors";
import { WaitTime, ageString, mostRecent, quotedISOFmt, subtractSeconds, timelineCutoffAt } from "../helpers/time_helpers";
import {
    CacheKey,
    TrendingType,
    STORAGE_KEYS_WITH_ACCOUNTS,
    STORAGE_KEYS_WITH_TOOTS,
    UNIQUE_ID_PROPERTIES,
    isTagTootsCategory,
    simpleCacheKeyDict,
    type ApiCacheKey,
} from "../enums";
import {
    findMinMaxId,
    getPromiseResults,
    removeKeys,
    sortObjsByCreatedAt,
    truncateToLength,
    uniquifyApiObjs,
} from "../helpers/collection_helpers";
import {
    type AccountLike,
    type ApiObj,
    type ApiObjWithID,
    type CacheTimestamp,
    type ConcurrencyLockRelease,
    type Hashtag,
    type MinMaxID,
    type Optional,
    type TootLike,
    type WithCreatedAt,
} from "../types";

/** Paginated data retrieval method from masto.js. */
type ApiFetcher<T> = (params: mastodon.DefaultPaginationParams) => (
    mastodon.Paginator<T[], mastodon.DefaultPaginationParams>
);

/** Conditional type that maps mastodon.v1.Status to Toot and mastodon.v1.Account to Account. */
type ResponseRow<T extends ApiObj> = T extends mastodon.v1.Status
    ? Toot
    : (T extends mastodon.v1.Account ? Account : T);

/**
 * Represents cached rows of API objects, including optional min/max ID information and cache timestamp.
 * @template T
 * @augments CacheTimestamp
 * @property {MinMaxID | null} [minMaxId] - The min/max ID in the cache if supported by the request.
 * @property {ResponseRow<T>[]} rows - Cached rows of API objects.
 */
interface CacheResult<T extends ApiObj> extends CacheTimestamp {
    minMaxId?: MinMaxID | null;
    rows: ResponseRow<T>[];
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
 * Extending ApiParams for endpoints that support a max_id parameter, extending ApiParams.
 * @augments ApiParams
 * @property {string | number | null} [maxId] - Optional maxId to use for pagination.
 */
interface ApiParamsWithMaxID extends ApiParams {
    maxId?: Optional<string> | Optional<number>,
};

/**
 * Extends ApiParamsWithMaxID with a mergeTootsToFeed function that merges fetched Toots into the main feed
 * as they are retrieved.
 * @augments ApiParamsWithMaxID
 * @property {(toots: Toot[], logger: Logger) => Promise<void>} mergeTootsToFeed - Function to merge fetched Toots into the main feed.
 */
interface HomeTimelineParams extends ApiParamsWithMaxID {
    mergeTootsToFeed: (toots: Toot[], logger: Logger) => Promise<void>,
};

/**
 * Parameters for fetching up to maxRecords rows of a user's data from the API.
 * @template T
 * @augments ApiParamsWithMaxID
 * @property {(pageOfResults: T[], allResults: T[]) => Promise<true | undefined>} [breakIf] - Function to check if more pages should be fetched.
 * @property {CacheKey} cacheKey - Cache key for storage.
 * @property {() => ApiFetcher<T>} fetchGenerator - Function to create a new API paginator for fetching data.
 * @property {boolean} [isBackgroundFetch] - Logging flag to indicate if this is a background fetch.
 * @property {(obj: ResponseRow<T>) => void} [processFxn] - Optional function to process the object before storing and returning it.
 * @property {boolean} [skipMutex] - If true, don't lock the endpoint mutex when making requests.
 */
interface FetchParams<T extends ApiObj> extends ApiParamsWithMaxID {
    breakIf?: (pageOfResults: T[], allResults: T[]) => Promise<true | undefined>,
    cacheKey: CacheKey,
    fetchGenerator: () => ApiFetcher<T>,
    isBackgroundFetch?: boolean,
    local?: boolean,
    processFxn?: (obj: ResponseRow<T>) => void,
    skipMutex?: boolean,
};

/**
 * Parameters for background fetches, extending FetchParams.
 * @template T
 * @augments FetchParams<T>
 * @property {number} minRecords - Minimum number of records to fetch.
 */
interface BackgroundFetchparams<T extends ApiObj> extends FetchParams<T> {
    minRecords: number,
};

/**
 * Same as FetchParams but with default/configured values filled in for some parameters.
 * @template T
 * @augments FetchParams<T>
 * @property {number} limit - The limit for the API request.
 * @property {Logger} logger - Logger instance for logging.
 * @property {number} [maxCacheRecords] - Optional maximum number of records to keep in the cache.
 * @property {number} maxRecords - Maximum number of records to fetch.
 */
interface FetchParamsComplete<T extends ApiObj> extends FetchParams<T> {
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
    maxIdForFetch: Optional<string> | Optional<number>,  // The max ID to use for the API request
    minIdForFetch: Optional<string> | Optional<number>,
};

/**
 * Same as FetchParams but with a few derived fields, including cache data and min/max ID params.
 * @template T
 * @augments FetchParamsComplete<T>
 * @augments MinMaxIDParams
 * @property {CachedRows<T> | null} cacheResult - The cached result for the request, if any.
 */
interface FetchParamsWithCacheData<T extends ApiObj> extends FetchParamsComplete<T>, MinMaxIDParams {
    cacheResult: Optional<CacheResult<T>>,
};

type FetchParamName = keyof FetchParamsWithCacheData<ApiObj>;
type LogParams<T extends ApiObj> = Omit<FetchParams<T>, "fetchGenerator">;
type PaginationParams = mastodon.DefaultPaginationParams | mastodon.rest.v1.ListTimelineParams;

// Constants
export const BIG_NUMBER = 10_000_000_000;
export const FULL_HISTORY_PARAMS = {maxRecords: BIG_NUMBER, moar: true};
// Mutex locking and concurrency
const USER_DATA_MUTEX = new Mutex();  // For locking user data fetching
// Logging
const PARAMS_TO_NOT_LOG: FetchParamName[] = ["breakIf", "fetchGenerator", "logger", "processFxn"];
const PARAMS_TO_NOT_LOG_IF_FALSE: FetchParamName[] = ["skipCache", "skipMutex", "moar"];

// Loggers prefixed by [API]
const getLogger = Logger.logBuilder('API');
export const apiLogger = getLogger();


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
export default class MastoApi {
    static #instance: MastoApi;

    api: mastodon.rest.Client;
    apiErrors: Error[] = [];
    homeDomain: string;
    logger: Logger = getLogger();
    user: Account;
    userData?: UserData;
    waitTimes = simpleCacheKeyDict(() => new WaitTime());

    private apiMutexes = simpleCacheKeyDict(() => new Mutex());   // For locking data fetching for an API endpoint
    private cacheMutexes = simpleCacheKeyDict(() => new Mutex()); // For locking checking the cache for an API endpoint
    private isHomeserverGoToSocial: Optional<boolean> = undefined;
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
        if (!(user.webfingerURI?.includes('@'))) {
            apiLogger.logAndThrowError(`MastoApi.init() 'user' argument isn't an Account!`, user);
        } else if (MastoApi.#instance) {
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
    static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }

    /**
     * Private constructor for MastoApi. Instantiate with `MastoApi.init()`.
     * @param {mastodon.rest.Client} api - Mastodon REST API client.
     * @param {Account} user - The authenticated user account.
     */
    private constructor(api: mastodon.rest.Client, user: Account) {
        this.api = api;
        this.user = user;
        this.homeDomain = user.homeserver;
        this.reset();
    }

    /**
     * Get the value of some MastoApi object's properties. For debugging/presentation only.
     * @returns {Record<string, object|string>}
     */
    currentState(): Record<string, object | string> {
        return {
            apiErrors: this.apiErrors,
            homeDomain: this.homeDomain,
            user: this.user,
            waitTimes: this.waitTimes,
        }
    }

    /**
     * Fetches the user's home timeline feed (recent toots from followed accounts and hashtags).
     * @param {HomeTimelineParams} params - Parameters for fetching the home feed.
     * @returns {Promise<Toot[]>} Array of Toots in the home feed.
     */
    async fetchHomeFeed(params: HomeTimelineParams): Promise<Toot[]> {
        const { maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = CacheKey.HOME_TIMELINE_TOOTS;
        const logger = this.loggerForParams({ ...params, cacheKey });
        let { maxId } = params;

        let homeTimelineToots = await Storage.getCoerced<Toot>(cacheKey);
        let allNewToots: Toot[] = [];
        let cutoffAt = timelineCutoffAt();
        let oldestTootStr = "no oldest toot";
        const startedAt = new Date();

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
            fetchGenerator: () => this.api.v1.timelines.home.list,
            cacheKey: cacheKey,
            maxId: maxId,
            maxRecords: maxRecords,
            skipCache: true,  // Home timeline manages its own cache state via breakIf()
            skipMutex: true,
            breakIf: async (newStatuses: TootLike[], allStatuses: TootLike[]) => {
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
        const msg = `Fetched ${allNewToots.length} new toots ${ageString(startedAt)} (${oldestTootStr}`;
        logger.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        homeTimelineToots = sortByCreatedAt(homeTimelineToots).reverse(); // TODO: should we sort by score?
        homeTimelineToots = truncateToLength(homeTimelineToots, config.toots.maxTimelineLength, logger);
        await Storage.set(cacheKey, homeTimelineToots);
        return homeTimelineToots;
    }

    /**
     * Gets the accounts blocked by the user (does not include muted accounts).
     * @returns {Promise<Account[]>} Array of blocked accounts.
     */
    async getBlockedAccounts(): Promise<Account[]> {
        const blockedAccounts = await this.getApiObjsAndUpdate<mastodon.v1.Account>({
            cacheKey: CacheKey.BLOCKED_ACCOUNTS,
            fetchGenerator: () => this.api.v1.blocks.list,
        }) as Account[];

        Account.logSuspendedAccounts(blockedAccounts, CacheKey.BLOCKED_ACCOUNTS);
        return blockedAccounts;
    }

    /**
     * Gets the Mastodon server domains that the user has blocked
     * Safe domain for testing: https://universeodon.com/@memes@pl.m0e.space
     * @returns {Promise<string[]>} Set of blocked domains.
     */
    async getBlockedDomains(): Promise<string[]> {
        const domains = await this.getApiObjsAndUpdate<string>({
            cacheKey: CacheKey.BLOCKED_DOMAINS,
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
     * @returns {Promise<Toot[]>} Array of Toot objects.
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
                toots = truncateToLength(toots, maxRecords, logger);
                await Storage.set(cacheKey, toots);
            }

            return toots;
        } catch (err) {
            // TODO: the hacky cast is because ApiCacheKey is broader than CacheKey
            await this.handleApiError({ cacheKey: cacheKey as CacheKey, logger }, [], err);
            return [];
        } finally {
            this.waitTimes[cacheKey].markEnd();
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
            cacheKey: CacheKey.FAVOURITED_TOOTS,
            fetchGenerator: () => this.api.v1.favourites.list,
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
            cacheKey: CacheKey.FOLLOWED_ACCOUNTS,
            fetchGenerator: () => this.api.v1.accounts.$select(this.user.id).following.list,
            minRecords: this.user.followingCount - 10, // We want to get at least this many followed accounts
            processFxn: (account) => account.isFollowed = true,
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
            cacheKey: CacheKey.FOLLOWED_TAGS,
            fetchGenerator: () => this.api.v1.followedTags.list,
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
            cacheKey: CacheKey.FOLLOWERS,
            fetchGenerator: () => this.api.v1.accounts.$select(this.user.id).followers.list,
            minRecords: this.user.followersCount - 10, // We want to get at least this many followed accounts
            processFxn: (account) => account.isFollower = true,
            ...(params || {})
        }) as Account[];
    }

    /**
     * Get the public toots on the user's home server (recent toots from users on the same server).
     * @param {ApiParams} params
     * @returns {Promise<Toot[]>} Array of public toots from the home server.
     */
    async getHomeserverToots(params?: ApiParams): Promise<Toot[]> {
        return await this.getApiObjsAndUpdate<mastodon.v1.Status>({
            cacheKey: CacheKey.HOMESERVER_TOOTS,
            fetchGenerator: () => this.api.v1.timelines.public.list,
            local: true,
            ...(params || {})
        }) as Toot[];
    }

    /**
     * Gets all muted accounts (including fully blocked accounts).
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of muted and blocked accounts.
     */
    async getMutedAccounts(params?: ApiParams): Promise<Account[]> {
        const mutedAccounts = await this.getApiObjsAndUpdate<mastodon.v1.Account>({
            cacheKey: CacheKey.MUTED_ACCOUNTS,
            fetchGenerator: () => this.api.v1.mutes.list,
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
        return await this.getApiObjsAndUpdate<mastodon.v1.Notification>({
            cacheKey: CacheKey.NOTIFICATIONS,
            fetchGenerator: () => this.api.v1.notifications.list,
            ...(params || {})
        }) as mastodon.v1.Notification[];
    }

    /**
     * Gets the user's recent toots.
     * @param {ApiParamsWithMaxID} [params] - Optional parameters.
     * @returns {Promise<Toot[]>} Array of recent user Toots.
     */
    async getRecentUserToots(params?: ApiParamsWithMaxID): Promise<Toot[]> {
        const fetchParams = {
            cacheKey: CacheKey.RECENT_USER_TOOTS,
            fetchGenerator: () => this.api.v1.accounts.$select(this.user.id).statuses.list,
            ...(params || {})
        };

        let toots = await this.getApiObjsAndUpdate<mastodon.v1.Status>(fetchParams) as Toot[];

        // TODO: somehow my account landed in a bad state with empty non-stale array of RecentUserToots.
        // That shouldn't happen but this is here in case it does.
        if (toots.length == 0 && this.user.statusesCount) {
            this.logger.warn(`No toots found for user ${this.user.acct} with ${this.user.statusesCount} total, busting cache`);
            toots = await this.getApiObjsAndUpdate<mastodon.v1.Status>({...fetchParams, bustCache: true}) as Toot[];
        }

        return toots;
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

            if (!filters) {
                filters = await this.api.v2.filters.list();

                // Filter out filters that either are just warnings or don't apply to the home context
                filters = filters.filter(filter => {
                    // Before Mastodon 4.0 Filter objects lacked a 'context' property altogether
                    if (filter.context?.length && !filter.context.includes("home")) return false;
                    if (filter.filterAction != "hide") return false;
                    return true;
                });

                logger.log(`Retrieved ${filters.length} filters ${ageString(startTime)}:`, filters);
                await Storage.set(CacheKey.SERVER_SIDE_FILTERS, filters);
            }

            return filters;
        } catch (err) {
            const msg = `Failed to get server-side filters`;
            logger.error(msg, err);
            this.apiErrors.push(new Error(msg, {cause: err}));
            return [];
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
    async getStatusesForTag(tagName: string, logger: Logger, numToots: number): Promise<TootLike[]> {
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
                const err = new Error(`Error getting toots for tag: "#${tagName}"`, {cause: results.rejectedReasons});
                this.apiErrors.push(err);
            }
        }

        const toots = results.fulfilled.flat();
        const msg = `#${tagName}: search endpoint got ${results.fulfilled[0]?.length || 0} toots, ` +
                  `hashtag timeline got ${results.fulfilled[1]?.length || 0} ` +
                  `${ageString(startedAt)} (total ${toots.length}, oldest=${quotedISOFmt(earliestTootedAt(toots))}`;
        logger.trace(`${msg}, newest=${quotedISOFmt(mostRecentTootedAt(toots))})`);
        return toots;
    }

    /**
     * Retrieves background data about the user for scoring, etc. Caches as an instance variable.
     * @param {boolean} [force] - If true, forces a refresh from the API.
     * @returns {Promise<UserData>} The UserData object.
     */
    async getUserData(force?: boolean): Promise<UserData> {
        const releaseMutex = await lockExecution(USER_DATA_MUTEX, this.logger);

        try {
            const hasNewest: boolean = this.userData ? (await this.userData.hasNewestApiData()) : false;

            if (force || !hasNewest) {
                this.userData = await UserData.build();
            }

            return this.userData!;
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
                cacheKey: CacheKey.HASHTAG_TOOTS,  // This CacheKey is just for log prefixes + signaling how to serialize
                fetchGenerator: () => this.api.v1.timelines.tag.$select(tagName).list,
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
            throwIfAccessTokenRevoked(logger, e, `Failed ${ageString(startedAt)}`);
            throw (e);
        } finally {
            releaseSemaphore();
        }
    }

    /**
     * Retrieve the user's home instance (mastodon server) configuration from the API.
     * @returns {Promise<mastodon.v2.Instance>} The instance configuration.
     */
    async instanceInfo(): Promise<mastodon.v2.Instance> {
        let instanceInfo = await Storage.getIfNotStale<mastodon.v2.Instance>(CacheKey.INSTANCE_INFO);

        if (!instanceInfo) {
            try {
                instanceInfo = await this.api.v2.instance.fetch();
                await Storage.set(CacheKey.INSTANCE_INFO, instanceInfo);
            } catch (err) {
                this.logger.error(`<instanceInfo()> Failed to fetch user's instance info, trying V1 API:`, err);
                const v1Instance = await this.api.v1.instance.fetch();

                if (v1Instance) {
                    const msg = `V2 instanceInfo() not available but v1 instance info exists. Unfortunately I will now discard it.`;
                    this.logger.logAndThrowError(msg, v1Instance);
                } else {
                    this.logger.logAndThrowError(`Failed to fetch Mastodon instance info from both V1 and V2 APIs`, err);
                }
            }
        }

        return instanceInfo;
    }

    /**
     * Return true if the user's home server is a GoToSocial server.
     * @returns {Promise<boolean>}
     */
    async isGoToSocialUser(): Promise<boolean> {
        if (isNil(this.isHomeserverGoToSocial)) {
            this.logger.debug(`Checking if user's home server is GoToSocial...`);
            const instance = await this.instanceInfo();
            this.isHomeserverGoToSocial = instance?.sourceUrl?.endsWith('gotosocial')

            if (typeof this.isHomeserverGoToSocial !== 'boolean') {
                this.logger.warn(`Failed to set isHomeserverGoToSocial to bool, sourceUrl: "${instance?.sourceUrl}", instance`, instance);
            } else {
                this.logger.debug(`Set isHomeserverGoToSocial to ${this.isHomeserverGoToSocial} based on instance:`, instance);
            }
        }

        return !!this.isHomeserverGoToSocial;
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
        if (toot.isLocal) return toot;
        const lookupResult = await this.api.v2.search.list({q: toot.realURI, resolve: true});

        if (!lookupResult?.statuses?.length) {
            logger.logAndThrowError(`Got bad result for "${toot.realURI}"`, lookupResult);
        }

        const resolvedStatus = lookupResult.statuses[0];
        logger.trace(`found resolvedStatus for "${toot.realURI}":`, resolvedStatus);
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
            throwIfAccessTokenRevoked(logger, e, `Failed ${ageString(startedAt)}`);
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
        this.logger.trace(`Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new Semaphore(concurrency);
    }

    /**
     * Returns the URL for an account on the Feialgo user's home server.
     * @param {Hashtag | string} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    accountUrl(account: Account): string {
        return account.homeserver == this.homeDomain ? account.url : this.endpointURL(`@${account.webfingerURI}`);
    }

    /**
     * Returns true if the URL is a local URL on the Feialgo user's home server.
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    isLocalUrl(url: string): boolean {
        return extractDomain(url) == this.homeDomain;
    }

    /**
     * Returns the URL for a tag on the Feialgo user's home server.
     * @param {Hashtag | string} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    tagUrl(tag: Hashtag | string): string {
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
    private endpointURL = (endpoint: string): string => `https://${this.homeDomain}/${endpoint}`;

    /**
     * Checks if the config supports min/max ID for a given cache key.
     * @private
     * @param {CacheKey} cacheKey - The cache key.
     * @returns {boolean} True if min/max ID is supported.
     */
    private supportsMinMaxId = (cacheKey: CacheKey): boolean => !!config.api.data[cacheKey]?.supportsMinMaxId;

    /**
     * Pure fetch of API records, no caching or background updates.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {Promise<ApiObj[]>} Array of API objects.
     */
    private async fetchApiObjs<T extends ApiObj>(params: FetchParamsWithCacheData<T>): Promise<ApiObj[]> {
        this.validateFetchParams<T>(params);
        const { breakIf, cacheKey, fetchGenerator, isBackgroundFetch, logger, maxRecords } = params;
        const waitTime = this.waitTimes[cacheKey];
        waitTime.markStart();  // Telemetry
        let newRows: T[] = [];
        let pageNumber = 0;

        try {
            for await (const page of fetchGenerator()(this.buildParams(params))) {
                waitTime.markEnd(); // telemetry
                newRows = newRows.concat(page as T[]);

                // breakIf() must be called before we check the length of rows!  // TODO: still necessary?
                const shouldStop = breakIf ? (await breakIf(page, newRows)) : false;
                const resultsMsg = `got page ${++pageNumber} with ${page.length} objs ${waitTime.ageString()}` +
                                   `, ${newRows.length} objs so far`;

                if (newRows.length >= maxRecords || page.length == 0 || shouldStop) {
                    const msg = `Fetch finished (${resultsMsg}, shouldStop=${shouldStop}, maxRecords=${maxRecords})`;
                    isTagTootsCategory(cacheKey) ? logger.trace(msg) : logger.debug(msg);
                    break;
                } else if (waitTime.ageInSeconds() > config.api.maxSecondsPerPage) {
                    logger.logAndThrowError(`Request took too long! (${waitTime.ageInSeconds()}s), ${resultsMsg}`)
                } else {
                    (pageNumber % 5 == 0) ? logger.debug(resultsMsg) : logger.trace(resultsMsg);
                }

                if (isBackgroundFetch) {
                    const sleepMS = config.api.backgroundLoadSleepBetweenRequestsMS * Math.random();  // Jitter spaces out requests
                    logger.trace(`Background fetch, sleeping for ${(sleepMS / 1000).toFixed(3)}s`);
                    await sleep(sleepMS);
                }

                waitTime.markStart();  // Reset timer for next page
            }

            if (cacheKey != CacheKey.HASHTAG_TOOTS) logger.info(`Retrieved ${newRows.length} objects`);
            return newRows;
        } catch (e) {
            return await this.handleApiError<T>(params, newRows, e);
        }
    }

    /**
     * Returns cached rows immediately if they exist, triggers background update if stale.
     * @private
     * @template T
     * @param {FetchParams<T>} inParams - Fetch parameters.
     * @returns {Promise<ApiObj[]>} Array of API objects.
     */
    private async getApiObjsAndUpdate<T extends ApiObj>(inParams: FetchParams<T>): Promise<ResponseRow<T>[]> {
        const paramsWithCache = await this.addCacheDataToParams<T>(inParams);
        const { cacheKey, cacheResult, logger, moar, skipMutex } = paramsWithCache;
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
     * @returns {Promise<ResponseRow[]>} Array of API objects.
     */
    private async getApiObjs<T extends ApiObj>(params: FetchParamsWithCacheData<T>): Promise<ResponseRow<T>[]> {
        const { cacheKey, isBackgroundFetch, maxCacheRecords, processFxn, skipCache, skipMutex } = params;
        const logger = params.logger.tempLogger('getApiObjs');
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

            let newRows = await this.fetchApiObjs<T>(params);
            // If endpoint has unique IDs use both cached and new rows (it's deduped in buildFromApiObjects())
            // newRows are in front so they will survive truncation (if it happens)
            newRows = UNIQUE_ID_PROPERTIES[cacheKey] ? [...newRows, ...cachedRows] : newRows;
            const objs = this.buildFromApiObjects<T>(cacheKey, newRows as T[], logger);

            // If we have a maxCacheRecords limit, truncate the new rows to that limit
            if (maxCacheRecords && objs.length > maxCacheRecords) {
                logger.warn(`Truncating ${objs.length} rows to maxCacheRecords=${maxCacheRecords}`);
                // TODO: there's a Mastodon object w/out created_at, so this would break but for now that object has no maxCacheRecords set for that endpoint
                const sortedByCreatedAt = sortObjsByCreatedAt(objs as WithCreatedAt[]) as T[];
                newRows = truncateToLength(sortedByCreatedAt, maxCacheRecords, logger);
            }

            if (processFxn) objs.filter(Boolean).forEach(obj => processFxn(obj));
            if (!skipCache) await Storage.set(cacheKey, objs);
            return objs;
        } catch (err) {
            const msg = `Error fetching API records for ${cacheKey} where there really shouldn't be!`;
            logger.error(msg, err);
            this.apiErrors.push(new Error(msg, {cause: err}));
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
     * @returns {Promise<ResponseRow[]>} Array of API objects.
     */
    private async getWithBackgroundFetch<T extends ApiObj>(
        params: BackgroundFetchparams<T>
    ): Promise<ResponseRow<T>[]> {
        const { minRecords } = params;
        const logger = this.loggerForParams(params).tempLogger('getWithBackgroundFetch');
        logger.trace(`Called with minRecords ${minRecords}`);
        const objs = await this.getApiObjsAndUpdate<T>(params);

        if (objs.length < minRecords) {
            logger.log(`Fewer rows (${objs.length}) than required (${minRecords}), launching bg job to get the rest`);
            this.getApiObjsAndUpdate<T>({...FULL_HISTORY_PARAMS, ...params, isBackgroundFetch: true});
        } else {
            logger.trace(`Have enough rows (have ${objs.length}, want ${minRecords}), doing nothing`);
        }

        return objs;
    }

    /**
     * Builds API request parameters for pagination.
     * @private
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {PaginationParams} API pagination parameters.
     */
    private buildParams<T extends ApiObj>(params: FetchParamsWithCacheData<T>): PaginationParams {
        const { limit, local, minIdForFetch, maxIdForFetch } = params;
        let apiParams: PaginationParams = { limit };
        if (minIdForFetch) apiParams = {...apiParams, minId: `${minIdForFetch}`};
        if (maxIdForFetch) apiParams = {...apiParams, maxId: `${maxIdForFetch}`};
        if (local) apiParams = {...apiParams, local: true};
        return apiParams;
    }

    /**
     * Fills in defaults in params and derives min/maxIdForFetch from cached data if appropriate.
     * @private
     * @template T
     * @param {FetchParams<T>} inParams - Fetch parameters.
     * @returns {Promise<FetchParamsWithCacheData<T>>} Completed fetch parameters with cache data.
     */
    private async addCacheDataToParams<T extends ApiObj>(
        inParams: FetchParams<T>
    ): Promise<FetchParamsWithCacheData<T>> {
        const params = this.fillInDefaultParams<T>(inParams);
        const { logger, maxId, moar } = params;
        let { maxRecords } = params;

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
     * @param {FetchParamsComplete<T>} params - Fetch parameters with defaults.
     * @returns {Promise<CacheResult<T> | null>} Cached rows or null.
     */
    private async getCacheResult<T extends ApiObj>(
        params: FetchParamsComplete<T>
    ): Promise<Optional<CacheResult<T>>> {
        const { bustCache, cacheKey, skipCache } = params;
        if (bustCache || skipCache) return null;
        const cachedData = await Storage.getWithStaleness(cacheKey);
        if (!cachedData) return null;
        const rows = cachedData.obj as ResponseRow<T>[];

        // NOTE: Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
        // or future. For a while we used a small offset to the list of toots sorted by created_at instead
        // of the actual min/max.
        return {
            isStale: cachedData.isStale,
            // minMaxId is not returned  if endpoint doesn't support min/max ID API requests (even if it exists)
            minMaxId: this.supportsMinMaxId(cacheKey) ? findMinMaxId(rows as ApiObjWithID[]) : null,
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
    private async handleApiError<T extends ApiObj>(
        params: Partial<FetchParamsWithCacheData<T>>,
        newRows: T[],
        err: Error | unknown,
    ): Promise<ResponseRow<T>[]> {
        const { cacheResult } = params;
        let { cacheKey, logger } = params;

        cacheKey ??= CacheKey.HOME_TIMELINE_TOOTS;  // TODO: this is a hack to avoid undefined cacheKey
        const waitTime = this.waitTimes[cacheKey];
        const requestDefaults = config.api.data[cacheKey] ?? {};
        logger = logger ? logger.tempLogger('handleApiError') : getLogger(cacheKey, 'handleApiError');
        logger.trace(`Handling API error for params:`, params, `\nerror:`, err);
        const cachedRows = cacheResult?.rows || [];

        if (!newRows?.length && requestDefaults.canBeDisabledOnGoToSocial && await this.isGoToSocialUser()) {
            const goToSocialWarning = config.api.errorMsgs.goToSocialHashtagTimeline(cacheKey);
            const goToSocialError = logger.line(`Failed to fetch data. ${goToSocialWarning}`);
            this.logger.warn(goToSocialError, err);
            this.apiErrors.push(new Error(goToSocialError, {cause: err}));
            return cachedRows;
        }

        let msg = `"${err}" after pulling ${newRows.length} rows (cache: ${cachedRows.length} rows).`;
        this.apiErrors.push(new Error(logger.line(msg), {cause: err}));
        throwIfAccessTokenRevoked(logger, err, `Failed ${waitTime.ageString()}. ${msg}`);
        const rows = newRows as ResponseRow<T>[];  // buildFromApiObjects() will sort out the types later

        // If endpoint doesn't support min/max ID and we have less rows than we started with use old rows
        if (UNIQUE_ID_PROPERTIES[cacheKey]) {
            logger.warn(`${msg} Merging cached + new rows on uniq property: "${UNIQUE_ID_PROPERTIES[cacheKey]}"`);
            return [...cachedRows, ...rows];
        } else if (!cacheResult?.minMaxId) {
            msg += ` Query didn't use incremental min/max ID.`;

            if (newRows.length < cachedRows.length) {
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
     * Builds Account or Toot objects from the relevant raw API types (Account and Status). Other types
     * are returned as-is, possibly uniquified by ID.
     * @private
     * @template T
     * @param {CacheKey} key - The cache key.
     * @param {ApiObj[]} objects - Array of API objects.
     * @param {Logger} logger - Logger instance.
     * @returns {ApiObj[]} Array of constructed objects.
     */
    private buildFromApiObjects<T extends ApiObj>(
        key: CacheKey,
        objects: T[],
        logger: Logger
    ): ResponseRow<T>[] {
        let newObjects: ResponseRow<T>[];
        const nullObjs = objects.filter(isNil);

        if (nullObjs.length) {
            logger.warn(`buildFromApiObjects() found ${nullObjs.length} null objects`, nullObjs);
        }

        if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            const toots = objects.map(obj => Toot.build(obj as TootLike));
            return Toot.dedupeToots(toots, logger.tempLogger(`buildFromApiObjects`)) as ResponseRow<T>[];
        } else if (STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            newObjects = objects.map(obj => Account.build(obj as AccountLike)) as ResponseRow<T>[];
        } else {
            newObjects = objects as ResponseRow<T>[];
        }

        return uniquifyApiObjs(key, newObjects, logger);  // This is a no-op for non-unique ID objects
    }

    /**
     * Populates fetch options with basic defaults for API requests.
     * @private
     * @template T
     * @param {FetchParams<T>} params - Fetch parameters.
     * @returns {FetchParamsComplete<T>} Fetch parameters with defaults filled in.
     */
    private fillInDefaultParams<T extends ApiObj>(params: FetchParams<T>): FetchParamsComplete<T> {
        const { cacheKey, logger, maxRecords } = params;
        const requestDefaults = config.api.data[cacheKey];
        const maxApiRecords = maxRecords || requestDefaults?.initialMaxRecords || MIN_RECORDS_FOR_FEATURE_SCORING;

        const withDefaults: FetchParamsComplete<T> = {
            ...params,
            limit: Math.min(maxApiRecords, requestDefaults?.limit ?? config.api.defaultRecordsPerPage),
            logger: logger ?? this.loggerForParams(params),
            maxRecords: maxApiRecords,
            maxCacheRecords: requestDefaults?.maxCacheRecords,
        };

        return withDefaults;
    }

    /**
     * Returns a logger instance for the given fetch parameters.
     * @private
     * @template T
     * @param {LogParams} params - Fetch parameters (excluding fetch).
     * @returns {Logger} Logger instance.
     */
    private loggerForParams<T extends ApiObj>(params: LogParams<T>): Logger {
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
    private shouldReturnCachedRows<T extends ApiObj>(params: FetchParamsWithCacheData<T>): boolean {
        const { cacheResult, moar } = params;
        return !!(cacheResult?.rows && !cacheResult.isStale && !moar);
    }

    /**
     * Validates that the fetch parameters are valid and work together.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     */
    private validateFetchParams<T extends ApiObj>(params: FetchParamsWithCacheData<T>): void {
        const { cacheKey, maxId, maxIdForFetch, minIdForFetch, moar, skipCache } = params;
        const logger = params.logger.tempLogger('validateFetchParams');

        if (moar && (skipCache || maxId)) {
            logger.warn(`skipCache=true AND moar or maxId set!`);
        }

        if (maxIdForFetch && minIdForFetch) {
            logger.logAndThrowError(`maxIdForFetch and minIdForFetch can't be used at same time!`, params);
        }

        // HASHTAG_TOOTS is a special case w/no cache usage, no min/max ID, and a lot of log spamming
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
};
