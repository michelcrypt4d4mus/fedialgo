import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from './objects/toot';
import UserData from "./user_data";
import { WaitTime } from '../helpers/log_helpers';
import { Logger } from '../helpers/logger';
import { type ApiCacheKey } from "../enums";
import { type ConcurrencyLockRelease, type MastodonTag, type Optional, type TootLike } from "../types";
/**
 * Generic parameters for MastoApi methods that support backfilling via the "moar" flag.
 * @property {boolean} [bustCache] - If true, don't use cached data and update the cache with new data.
 * @property {Logger} [logger] - Optional logger to use for logging API calls.
 * @property {number} [maxRecords] - Optional max number of records to fetch.
 * @property {boolean} [moar] - If true, continue fetching from the max_id found in the cache.
 * @property {boolean} [skipCache] - If true, don't use cached data.
 */
export interface ApiParams {
    bustCache?: boolean;
    logger?: Logger;
    maxRecords?: number;
    moar?: boolean;
    skipCache?: boolean;
}
/**
 * Extending ApiParams for endpoints that support a max_id parameter, extending ApiParams.
 * @augments ApiParams
 * @property {string | number | null} [maxId] - Optional maxId to use for pagination.
 */
interface ApiParamsWithMaxID extends ApiParams {
    maxId?: Optional<string> | Optional<number>;
}
/**
 * Extends ApiParamsWithMaxID with a mergeTootsToFeed function that merges fetched Toots into the main feed
 * as they are retrieved.
 * @augments ApiParamsWithMaxID
 * @property {(toots: Toot[], logger: Logger) => Promise<void>} mergeTootsToFeed - Function to merge fetched Toots into the main feed.
 */
interface HomeTimelineParams extends ApiParamsWithMaxID {
    mergeTootsToFeed: (toots: Toot[], logger: Logger) => Promise<void>;
}
export declare const BIG_NUMBER = 10000000000;
export declare const FULL_HISTORY_PARAMS: {
    maxRecords: number;
    moar: boolean;
};
export declare const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
export declare const RATE_LIMIT_ERROR_MSG = "Too many requests";
export declare const apiLogger: Logger;
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
    #private;
    api: mastodon.rest.Client;
    apiErrors: Error[];
    homeDomain: string;
    logger: Logger;
    user: Account;
    userData?: UserData;
    waitTimes: Record<ApiCacheKey, WaitTime>;
    private apiMutexes;
    private cacheMutexes;
    private requestSemphore;
    /**
     * Initializes the singleton MastoApi instance with the provided Mastodon API client and user account.
     * If an instance already exists, logs a warning and does nothing.
     * Loads user data from storage and assigns it to the instance.
     * @param {mastodon.rest.Client} api - The Mastodon REST API client.
     * @param {Account} user - The authenticated user account.
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    static init(api: mastodon.rest.Client, user: Account): Promise<void>;
    /**
     * Returns the singleton instance of MastoApi.
     * @returns {MastoApi}
     * @throws {Error} If the instance has not been initialized.
     */
    static get instance(): MastoApi;
    /**
     * Private constructor for MastoApi. Instantiate with `MastoApi.init()`.
     * @param {mastodon.rest.Client} api - Mastodon REST API client.
     * @param {Account} user - The authenticated user account.
     */
    private constructor();
    /**
     * Get the value of some MastoApi object's properties. For debugging/presentation only.
     * @returns {Record<string, object|string>}
     */
    currentState(): Record<string, object | string>;
    /**
     * Fetches the user's home timeline feed (recent toots from followed accounts and hashtags).
     * @param {HomeTimelineParams} params - Parameters for fetching the home feed.
     * @returns {Promise<Toot[]>} Array of Toots in the home feed.
     */
    fetchHomeFeed(params: HomeTimelineParams): Promise<Toot[]>;
    /**
     * Gets the accounts blocked by the user (does not include muted accounts).
     * @returns {Promise<Account[]>} Array of blocked accounts.
     */
    getBlockedAccounts(): Promise<Account[]>;
    /**
     * Gets the Mastodon server domains that the user has blocked
     * Safe domain for testing: https://universeodon.com/@memes@pl.m0e.space
     * @returns {Promise<string[]>} Set of blocked domains.
     */
    getBlockedDomains(): Promise<string[]>;
    /**
     * Generic data getter for cacheable Toots with custom fetch logic.
     * Used for various hashtag feeds (participated, trending, favourited).
     * @param {() => Promise<TootLike[]>} fetchStatuses - Function to fetch statuses.
     * @param {ApiCacheKey} cacheKey - Cache key for storage.
     * @param {number} maxRecords - Maximum number of records to fetch.
     * @returns {Promise<Toot[]>} Array of Toots.
     */
    getCacheableToots(fetchStatuses: () => Promise<TootLike[]>, cacheKey: ApiCacheKey, maxRecords: number): Promise<Toot[]>;
    /**
     * Gets the toots recently favourited by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Toot[]>} Array of favourited Toots.
     */
    getFavouritedToots(params?: ApiParams): Promise<Toot[]>;
    /**
     * Gets the accounts followed by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of followed accounts.
     */
    getFollowedAccounts(params?: ApiParams): Promise<Account[]>;
    /**
     * Gets the hashtags followed by the user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<mastodon.v1.Tag[]>} Array of followed tags.
     */
    getFollowedTags(params?: ApiParams): Promise<mastodon.v1.Tag[]>;
    /**
     * Gets the followers of the Fedialgo user.
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of follower accounts.
     */
    getFollowers(params?: ApiParams): Promise<Account[]>;
    /**
     * Get the public toots on the user's home server (recent toots from users on the same server).
     * @param {ApiParams} params
     * @returns {Promise<Toot[]>} Array of public toots from the home server.
     */
    getHomeserverToots(params?: ApiParams): Promise<Toot[]>;
    /**
     * Gets all muted accounts (including fully blocked accounts).
     * @param {ApiParams} [params] - Optional parameters.
     * @returns {Promise<Account[]>} Array of muted and blocked accounts.
     */
    getMutedAccounts(params?: ApiParams): Promise<Account[]>;
    /**
     * Gets the user's recent notifications.
     * @param {ApiParamsWithMaxID} [params] - Optional parameters.
     * @returns {Promise<mastodon.v1.Notification[]>} Array of notifications.
     */
    getNotifications(params?: ApiParamsWithMaxID): Promise<mastodon.v1.Notification[]>;
    /**
     * Gets the user's recent toots.
     * @param {ApiParamsWithMaxID} [params] - Optional parameters.
     * @returns {Promise<Toot[]>} Array of recent user Toots.
     */
    getRecentUserToots(params?: ApiParamsWithMaxID): Promise<Toot[]>;
    /**
     * Retrieves content-based feed filters set up by the user on the server.
     * @returns {Promise<mastodon.v2.Filter[]>} Array of server-side filters.
     */
    getServerSideFilters(): Promise<mastodon.v2.Filter[]>;
    /**
     * Gets the latest toots for a given tag using both the Search API and tag timeline API.
     * The two APIs give results with surprisingly little overlap (~80% of toots are unique).
     * @param {string} tagName - The tag to search for.
     * @param {Logger} logger - Logger instance for logging.
     * @param {number} [numToots] - Number of toots to fetch.
     * @returns {Promise<TootLike[]>} Array of TootLike objects.
     */
    getStatusesForTag(tagName: string, logger: Logger, numToots: number): Promise<TootLike[]>;
    /**
     * Retrieves background data about the user for scoring, etc. Caches as an instance variable.
     * @param {boolean} [force] - If true, forces a refresh from the API.
     * @returns {Promise<UserData>} The UserData object.
     */
    getUserData(force?: boolean): Promise<UserData>;
    /**
     * Fetches toots from the tag timeline API (different from the search API).
     * Concurrency is managed by a semaphore. See https://docs.joinmastodon.org/methods/v1/timelines/#tag
     * TODO: Could maybe use min_id and max_id to avoid re-fetching the same data
     * @param {string} tagName - The tag to fetch toots for.
     * @param {Logger} logger - Logger instance for logging.
     * @param {number} [maxRecords] - Maximum number of records to fetch.
     * @returns {Promise<Toot[]>} Array of Toots.
     */
    hashtagTimelineToots(tagName: string, logger: Logger, maxRecords?: number): Promise<Toot[]>;
    /**
     * Retrieve the user's home instance (mastodon server) configuration from the API.
     * @returns {Promise<mastodon.v2.Instance>} The instance configuration.
     */
    instanceInfo(): Promise<mastodon.v2.Instance>;
    /**
     * Locks all API and cache mutexes for cache state operations.
     * @returns {Promise<ConcurrencyLockRelease[]>} Array of lock release functions.
     */
    lockAllMutexes(): Promise<ConcurrencyLockRelease[]>;
    /**
     * Resolves a foreign server toot URI to one on the user's local server using the v2 search API.
     * transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
     *                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
     * @param {Toot} toot - The toot to resolve.
     * @returns {Promise<Toot>} The resolved toot.
     */
    resolveToot(toot: Toot): Promise<Toot>;
    /**
     * Performs a keyword substring search for toots using the search API.
     * @param {string} searchStr - The string to search for.
     * @param {Logger} logger - Logger instance for logging.
     * @param {number} [maxRecords] - Maximum number of records to fetch.
     * @returns {Promise<mastodon.v1.Status[]>} Array of status objects.
     */
    searchForToots(searchStr: string, logger: Logger, maxRecords?: number): Promise<mastodon.v1.Status[]>;
    /**
     * Resets the API state, clearing errors and user data, and resetting concurrency.
     */
    reset(): void;
    /**
     * Sets the concurrency for the request semaphore.
     * @param {number} concurrency - The new concurrency value.
     */
    setSemaphoreConcurrency(concurrency: number): void;
    /**
     * Returns the URL for an account on the Feialgo user's home server.
     * @param {MastodonTag | string} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    accountUrl(account: Account): string;
    /**
     * Returns true if the URL is a local URL on the Feialgo user's home server.
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    isLocalUrl(url: string): boolean;
    /**
     * Returns the URL for a tag on the Feialgo user's home server.
     * @param {MastodonTag | string} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    tagUrl(tag: MastodonTag | string): string;
    /**
     * Returns the URL for a given API endpoint on the user's home server.
     * @private
     * @param {string} endpoint - The API endpoint.
     * @returns {string} The full endpoint URL.
     */
    private endpointURL;
    /**
     * Checks if the config supports min/max ID for a given cache key.
     * @private
     * @param {CacheKey} cacheKey - The cache key.
     * @returns {boolean} True if min/max ID is supported.
     */
    private supportsMinMaxId;
    /**
     * Pure fetch of API records, no caching or background updates.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {Promise<ApiObj[]>} Array of API objects.
     */
    private fetchApiObjs;
    /**
     * Returns cached rows immediately if they exist, triggers background update if stale.
     * @private
     * @template T
     * @param {FetchParams<T>} inParams - Fetch parameters.
     * @returns {Promise<ApiObj[]>} Array of API objects.
     */
    private getApiObjsAndUpdate;
    /**
     * Generic Mastodon API fetcher. Uses cache if possible, fetches from API if cache is empty or stale.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {Promise<ResponseRow[]>} Array of API objects.
     */
    private getApiObjs;
    /**
     * Gets maxRecords, and if not more than minRecords, launches a background fetch.
     * @private
     * @template T
     * @param {BackgroundFetchparams<T>} params - Background fetch parameters.
     * @returns {Promise<ResponseRow[]>} Array of API objects.
     */
    private getWithBackgroundFetch;
    /**
     * Builds API request parameters for pagination.
     * @private
     * @param {FetchParamsWithCacheData<any>} params - Fetch parameters with cache data.
     * @returns {mastodon.DefaultPaginationParams|mastodon.rest.v1.ListTimelineParams} API pagination parameters.
     */
    private buildParams;
    /**
     * Fills in defaults in params and derives min/maxIdForFetch from cached data if appropriate.
     * @private
     * @template T
     * @param {FetchParams<T>} inParams - Fetch parameters.
     * @returns {Promise<FetchParamsWithCacheData<T>>} Completed fetch parameters with cache data.
     */
    private addCacheDataToParams;
    /**
     * Loads rows from the cache unless skipCache=true. Thin wrapper around Storage.getWithStaleness.
     * @private
     * @template T
     * @param {FetchParamsComplete<T>} params - Fetch parameters with defaults.
     * @returns {Promise<CacheResult<T> | null>} Cached rows or null.
     */
    private getCacheResult;
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
    private handleApiError;
    /**
     * Builds Account or Toot objects from the relevant raw API types (Account and Status). Other types
     * are returned as-is, possibly uniquified by ID.
     * @private
     * @param {CacheKey} key - The cache key.
     * @param {ApiObj[]} objects - Array of API objects.
     * @param {Logger} logger - Logger instance.
     * @returns {ApiObj[]} Array of constructed objects.
     */
    private buildFromApiObjects;
    /**
     * Populates fetch options with basic defaults for API requests.
     * @template T
     * @param {FetchParams<T>} params - Fetch parameters.
     * @returns {FetchParamsComplete<T>} Fetch parameters with defaults filled in.
     */
    private fillInDefaultParams;
    /**
     * Returns a logger instance for the given fetch parameters.
     * @template T
     * @param {Omit<FetchParams<T>, "fetchGenerator">} params - Fetch parameters (excluding fetch).
     * @returns {Logger} Logger instance.
     */
    private loggerForParams;
    /**
     * Returns true if the cache is fresh and we don't need to fetch more data.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     * @returns {boolean} True if cached rows should be returned.
     */
    private shouldReturnCachedRows;
    /**
     * Validates that the fetch parameters are valid and work together.
     * @private
     * @template T
     * @param {FetchParamsWithCacheData<T>} params - Fetch parameters with cache data.
     */
    private validateFetchParams;
}
export {};
