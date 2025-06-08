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
import { TrendingType } from '../enums';
import {
    asOptionalArray,
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

interface CachedRows<T> extends CacheTimestamp {
    minMaxId?: MinMaxID | null;    // If the request supports min/max ID, the min/max ID in the cache
    rows: T[];                     // Cached rows of API objects
};

interface MinMaxIDParams {
    maxIdForFetch: string | number | null,  // The max ID to use for the API request
    minIdForFetch: string | number | null,
};

// Generic params for MastoApi methods that support backfilling via "moar" flag
//   - maxId: optional maxId to use for pagination
//   - maxRecords: optional max number of records to fetch
//   - skipCache: if true, don't use cached data
export interface ApiParams {
    logger?: Logger,  // Optional logger to use for logging API calls
    maxRecords?: number,
    moar?: boolean,
    skipCache?: boolean,
};

// Generic params that apply to a lot of methods in the MastoApi class
//   - moar: if true, continue fetching from the max_id found in the cache
interface MaxIdParams extends ApiParams {
    maxId?: string | number | null,
};

// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
//   - breakIf: fxn to call to check if we should fetch more pages
//   - fetch: the data fetching function to call with params
//   - isBackgroundFetch: a logging flag to indicate if this is a background fetch
//   - label: if it's a StorageKey use it for caching, if it's a string just use it for logging
//   - processFxn: optional function to process the object before storing and returning it
//   - skipCache: if true, don't use cached data and don't lock the endpoint mutex when making requests
interface FetchParams<T extends MastodonApiObject> extends MaxIdParams {
    breakIf?: ((pageOfResults: T[], allResults: T[]) => Promise<true | undefined>) | null ,
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    cacheKey: CacheKey,
    isBackgroundFetch?: boolean,
    processFxn?: ((obj: T) => void) | null,
    skipMutex?: boolean,
};

// Same as FetchParams but all properties are required and we add 'limit'
interface FetchParamsWithDefaults<T extends MastodonApiObject> extends Required<FetchParams<T>> {
    limit: number,
    maxCacheRecords?: number,
};

// Same as FetchParams but with a few derived fields
interface FetchParamsWithCacheData<T extends MastodonApiObject> extends FetchParamsWithDefaults<T>, MinMaxIDParams {
    cacheResult: CachedRows<T> | null,
};

// Home timeline request params
//   - mergeTootsToFeed: fxn to call to merge the fetched Toots into the main feed
interface HomeTimelineParams extends MaxIdParams {
    mergeTootsToFeed: (toots: Toot[], logger: Logger) => Promise<void>,
};

type FetchParamName = keyof FetchParamsWithCacheData<any>;

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


export default class MastoApi {
    static #instance: MastoApi;  // Singleton instance of MastoApi

    api: mastodon.rest.Client;
    apiErrors: Error[] = [];  // Errors encountered while using the API
    homeDomain: string;
    logger: Logger = getLogger();
    user: Account;
    userData?: UserData;  // Save UserData in the API object to avoid polling local storage over and over
    waitTimes = buildCacheKeyDict(() => new WaitTime()); // Just for measuring performance (poorly)

    private apiMutexes = buildCacheKeyDict(() => new Mutex());   // For locking data fetching for an API endpoint
    private cacheMutexes = buildCacheKeyDict(() => new Mutex()); // For locking checking the cache for an API endpoint
    private requestSemphore = new Semaphore(config.api.maxConcurrentHashtagRequests); // Concurrency of search & hashtag requests

    static async init(api: mastodon.rest.Client, user: Account): Promise<void> {
        if (MastoApi.#instance) {
            apiLogger.warn(`MastoApi instance already initialized...`);
            return;
        }

        apiLogger.log(`Initializing MastoApi instance with user:`, user.acct);
        MastoApi.#instance = new MastoApi(api, user);
        MastoApi.#instance.userData = await Storage.loadUserData();
    }

    public static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }

    private constructor(api: mastodon.rest.Client, user: Account) {
        this.api = api;
        this.user = user;
        this.homeDomain = extractDomain(user.url);
        this.reset();
    }

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags).
    // TODO: should there be a mutex? Only called by triggerFeedUpdate() which can only run once at a time
    async fetchHomeFeed(params: HomeTimelineParams): Promise<Toot[]> {
        let { maxId, maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = CacheKey.HOME_TIMELINE_TOOTS;
        const logger = loggerForParams({ ...params, cacheKey });
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
        const _incompleteToots = await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.timelines.home.list,
            cacheKey: cacheKey,
            maxId: maxId,
            maxRecords: maxRecords,
            skipCache: true,  // always skip the cache for the home timeline
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

    // Get blocked accounts (doesn't include muted accounts)
    async getBlockedAccounts(): Promise<Account[]> {
        const blockedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.blocks.list,
            cacheKey: CacheKey.BLOCKED_ACCOUNTS
        }) as Account[];

        Account.logSuspendedAccounts(blockedAccounts, CacheKey.BLOCKED_ACCOUNTS);
        return blockedAccounts;
    }

    // Generic data getter for things we want to cache but require custom fetch logic.
    // Currently used for the variou hashtag feeds (participated, trending, favourited).
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

    // Get an array of Toots the user has recently favourited: https://docs.joinmastodon.org/methods/favourites/#get
    // IDs of accounts ar enot monotonic so there's not really any way to incrementally load this endpoint
    async getFavouritedToots(params?: ApiParams): Promise<Toot[]> {
        return await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.favourites.list,
            cacheKey: CacheKey.FAVOURITED_TOOTS,
            ...(params || {})
        }) as Toot[];
    }

    // Get accounts the user is following
    async getFollowedAccounts(params?: ApiParams): Promise<Account[]> {
        return await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            cacheKey: CacheKey.FOLLOWED_ACCOUNTS,
            processFxn: (account) => (account as Account).isFollowed = true,
            ...(params || {})
        }) as Account[];
    }

    // Get hashtags the user is following
    async getFollowedTags(params?: ApiParams): Promise<mastodon.v1.Tag[]> {
        return await this.getApiRecords<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            cacheKey: CacheKey.FOLLOWED_TAGS,
            processFxn: (tag) => repairTag(tag),
            ...(params || {})
        }) as mastodon.v1.Tag[];
    }

    // Get the Fedialgo user's followers
    async getFollowers(params?: ApiParams): Promise<Account[]> {
        const followers = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).followers.list,
            cacheKey: CacheKey.FOLLOWERS,
            processFxn: (account) => (account as Account).isFollower = true,
            ...(params || {})
        }) as Account[];

        this.logger.tempLogger(CacheKey.FOLLOWERS).trace(`${followers.length} followers for ${this.user.acct}`, followers);
        return followers;
    }

    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts(params?: ApiParams): Promise<Account[]> {
        const mutedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.mutes.list,
            cacheKey: CacheKey.MUTED_ACCOUNTS,
            ...(params || {})
        }) as Account[];

        Account.logSuspendedAccounts(mutedAccounts, CacheKey.MUTED_ACCOUNTS);
        return mutedAccounts.concat(await this.getBlockedAccounts());
    }

    // Get the user's recent notifications
    async getNotifications(params?: MaxIdParams): Promise<mastodon.v1.Notification[]> {
        const notifs = await this.getApiRecords<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            cacheKey: CacheKey.NOTIFICATIONS,
            ...(params || {})
        }) as mastodon.v1.Notification[];

        this.logger.log(`[${CacheKey.NOTIFICATIONS}] getNotifications() retrieved ${notifs.length} notifications:`);
        return notifs;
    }

    // Get the user's recent toots
    // NOTE: the user's own Toots don't have completeProperties() called on them!
    async getRecentUserToots(params?: MaxIdParams): Promise<Toot[]> {
        return await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            cacheKey: CacheKey.RECENT_USER_TOOTS,
            ...(params || {})
        }) as Toot[];
    }

    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.getApiRecords() doesn't work here because endpoint doesn't paginate the same way
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

    // Get latest toots for a given tag using both the Search API and tag timeline API.
    // The two APIs give results with surprising little overlap (~80% of toots are unique)
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
        let msg = `search endpoint got ${results.fulfilled[0].length} toots, hashtag timeline got ${results.fulfilled[1].length}`;
        msg += ` ${ageString(startedAt)} (total ${toots.length}, oldest=${quotedISOFmt(earliestTootedAt(toots))}`;
        logger.trace(`${msg}, newest=${quotedISOFmt(mostRecentTootedAt(toots))})`);
        return toots;
    }

    // Retrieve background data about the user that will be used for scoring etc.
    // Caches as an instance variable so the storage doesn't have to be hit over and over
    async getUserData(force?: boolean): Promise<UserData> {
        const releaseMutex = await lockExecution(USER_DATA_MUTEX, this.logger);

        try {
            if (force || !this.userData || (await this.userData.isDataStale())) {
                this.userData = await UserData.build();
            }

            return this.userData;
        } finally {
            releaseMutex();
        }
    }

    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // Concurrency is managed by a semaphore in this method, not the normal mutexes.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could maybe use the min_id param to avoid redundancy and extra work reprocessing the same toots
    async hashtagTimelineToots(tagName: string, logger: Logger, maxRecords?: number): Promise<Toot[]> {
        maxRecords = maxRecords || config.api.defaultRecordsPerPage;
        const releaseSemaphore = await lockExecution(this.requestSemphore, logger);
        const startedAt = new Date();

        try {
            const toots = await this.getApiRecords<mastodon.v1.Status>({
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

            logger.trace(`Retrieved ${toots.length} toots ${ageString(startedAt)}`);
            return toots as Toot[];
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(logger, e, `Failed ${ageString(startedAt)}`);
            throw (e);
        } finally {
            releaseSemaphore();
        }
    }

    // Retrieve the user's home instance configuration from the API
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

    // Lock all the API mutexes so we can do stuff with the cache state
    async lockAllMutexes(): Promise<ConcurrencyLockRelease[]> {
        const allMutexes = Object.values(this.apiMutexes).concat(Object.values(this.cacheMutexes));
        const mutexLogger = apiLogger.tempLogger('lockAllMutexes');
        mutexLogger.log(`Locking all mutexes...`);
        return await Promise.all(allMutexes.map(mutex => lockExecution(mutex, mutexLogger)));
    };

    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot: Toot): Promise<Toot> {
        const logger = getLogger('resolveToot()', toot.realURI());
        logger.trace(`called for`, toot);
        const tootURI = toot.realURI();
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

    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr: string, logger: Logger, maxRecords?: number): Promise<mastodon.v1.Status[]> {
        maxRecords = maxRecords || config.api.defaultRecordsPerPage;
        const releaseSemaphore = await lockExecution(this.requestSemphore, logger);
        const query: mastodon.rest.v1.SearchParams = {limit: maxRecords, q: searchStr, type: TrendingType.STATUSES};
        const startedAt = new Date();

        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            logger.trace(`Retrieved ${statuses.length} toots ${ageString(startedAt)}`);
            return statuses;
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(logger, e, `Failed ${ageString(startedAt)}`);
            throw (e);
        } finally {
            releaseSemaphore();
        }
    }

    // Called on instantiation and also when we are trying to reset state of the world
    reset(): void {
        this.apiErrors = [];
        this.userData = undefined;  // Clear the user data cache
        this.setSemaphoreConcurrency(config.api.maxConcurrentHashtagRequests);
    };

    // After the initial load we don't need to have massive concurrency and in fact it can be a big resource
    // drain switching back to the browser window, which triggers a lot of background requests
    // TODO: should this call this.requestSemphore.setValue() instead? https://www.npmjs.com/package/async-mutex
    setSemaphoreConcurrency(concurrency: number): void {
        this.logger.log(`Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new Semaphore(concurrency);
    }

    // URL for tag on the user's homeserver
    tagUrl(tag: MastodonTag | string) {
        return `${this.endpointURL(TrendingType.TAGS)}/${typeof tag == "string" ? tag : tag.name}`;
    }

    /////////////////////////////
    //     Private Methods     //
    /////////////////////////////

    // URL for a given API endpoint on this user's home server
    private endpointURL = (endpoint: string) => `https://${this.homeDomain}/${endpoint}`;
    // Check the config for supportsMinMaxId boolean
    private supportsMinMaxId = (cacheKey: CacheKey) => !!config.api.data[cacheKey]?.supportsMinMaxId;

    // Pure fetch of API records, no caching or background updates
    private async fetchApiRecords<T extends MastodonApiObject>(
        params: FetchParamsWithCacheData<T>
    ): Promise<MastodonApiObject[]> {
        const { breakIf, cacheKey, fetch, logger, maxRecords } = params;
        const waitTime = this.waitTimes[cacheKey];
        waitTime.markStart();  // Telemetry
        let newRows: T[] = [];
        let pageNumber = 0;

        try {
            for await (const page of fetch(this.buildParams(params))) {
                waitTime.markEnd(); // telemetry
                newRows = newRows.concat(page as T[]);

                // breakIf() must be called before we check the length of rows!  // TODO: still necessary?
                const shouldStop = breakIf ? (await breakIf(page, newRows)) : false;
                let resultsMsg = `${page.length} in page ${++pageNumber}, ${newRows.length} records so far`;
                resultsMsg += ` ${waitTime.ageString()}`;

                if (newRows.length >= maxRecords || page.length == 0 || shouldStop) {
                    logger.debug(`Fetch finished (${resultsMsg}, shouldStop=${shouldStop}, maxRecords=${maxRecords})`);
                    break;
                } else if (waitTime.ageInSeconds() > config.api.maxSecondsPerPage) {
                    logger.logAndThrowError(`Request took too long! (${waitTime.ageInSeconds()}s), ${resultsMsg}`)
                } else {
                    const msg = `Retrieved ${resultsMsg}`;
                    (pageNumber % 5 == 0) ? logger.debug(msg) : logger.trace(msg);
                }

                waitTime.markStart();  // Reset timer for next page
            }

            return newRows;
        } catch (e) {
            return this.handleApiError<T>(params, newRows, e);
        }
    }

    // Return cached rows (if they exist) but trigger a background update if the cache is stale,
    // otherwise do a normal API fetch
    private async getApiRecords<T extends MastodonApiObject>(inParams: FetchParams<T>): Promise<MastodonApiObject[]> {
        const paramsWithCache = await this.addCacheDataToParams<T>(inParams);
        let { cacheKey, cacheResult, logger, skipMutex } = paramsWithCache;
        const hereLogger = logger.tempLogger('getFromCacheWithRefresh');
        const releaseMutex = skipMutex ? null : await lockExecution(this.cacheMutexes[cacheKey], hereLogger);

        try {
            // TODO: maybe check that there's more than 0 rows in the cache before returning them?
            if (cacheResult) {
                if (cacheResult.isStale) {
                    // If the mutex is locked background load is in progress so don't start another one
                    if (!this.apiMutexes[cacheKey].isLocked()) {
                        hereLogger.debug(`Returning ${cacheResult.rows.length} stale rows and triggering cache update`);
                        this.getApiRecordsOrCache<T>({...paramsWithCache, isBackgroundFetch: true});
                    }
                }

                return cacheResult.rows;
            } else {
                hereLogger.debug(`No cached rows found, fetching from API...`);
                return await this.getApiRecordsOrCache<T>(paramsWithCache);
            }
        } finally {
            releaseMutex?.();
        }
    }

    // Generic Mastodon API fetcher. Accepts a 'fetch' fxn w/a few other args (see comments on FetchParams)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    private async getApiRecordsOrCache<T extends MastodonApiObject>(
        params: FetchParamsWithCacheData<T>
    ): Promise<MastodonApiObject[]> {
        let { cacheKey, isBackgroundFetch, logger, maxCacheRecords, processFxn, skipCache, skipMutex } = params;
        logger = logger.tempLogger('getApiRecordsOrCache');

        if (this.apiMutexes[cacheKey].isLocked()) {
            if (isBackgroundFetch) {
                logger.trace(`Called but mutex already locked (background load in progress, nothing to do)`);
            } else {
                logger.error(`ApiMutex is already locked but shouldn't be! Returning empty array...`);
            }

            return [];
        }

        this.validateFetchParams<T>(params);
        const releaseMutex = skipMutex ? null : await lockExecution(this.apiMutexes[cacheKey], logger);

        try {
            // Check the cache again, in case it was updated while we were waiting for the mutex
            params.cacheResult = await this.getCacheResult<T>(params);
            const cachedRows = params.cacheResult?.rows || [];

            if (this.shouldReturnCachedRows(params)) {
                logger.trace(`Returning ${cachedRows.length} cached rows`);
                return cachedRows;
            }

            let newRows = await this.fetchApiRecords<T>(params) as T[];

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

    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    private buildParams(params: FetchParamsWithCacheData<any>): mastodon.DefaultPaginationParams {
        const { limit, minIdForFetch, maxIdForFetch } = params;
        let apiParams: mastodon.DefaultPaginationParams = { limit };
        if (minIdForFetch) apiParams = {...apiParams, minId: `${minIdForFetch}`};
        if (maxIdForFetch) apiParams = {...apiParams, maxId: `${maxIdForFetch}`};
        return apiParams;
    }

    // Fill in defaults in params and derive the min/maxIdForFetch from cached data if appropriate
    private async addCacheDataToParams<T extends MastodonApiObject>(
        inParams: FetchParams<T>
    ): Promise<FetchParamsWithCacheData<T>> {
        const params = fillInDefaultParams<T>(inParams);
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
                logger.info(`Getting MOAR_DATA; loading backwards from minId in cache: "${minMaxIdParams.maxIdForFetch}"`);
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

    // Load rows from the cache unless skipCache=true. Thin wrapper around Storage.getWithStaleness().
    private async getCacheResult<T extends MastodonApiObject>(
        params: FetchParamsWithDefaults<T>
    ): Promise<CachedRows<T> | null> {
        const { cacheKey, skipCache } = params;
        if (skipCache) return null;
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

    // If the access token was not revoked we need to decide which of the rows we have to keep.
    // handleApiError() will make a decision about whether to use the cache, the new rows, or both
    // and return the appropriate rows and return the appropriate rows in a single array.
    // TODO: handle rate limiting errors
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

    // Construct an Account or Toot object from the API object (otherwise just return the object)
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

    // Returns true if the cache is fresh and we don't need to fetch more data
    private shouldReturnCachedRows<T extends MastodonApiObject>(params: FetchParamsWithCacheData<T>) {
        const { cacheResult, moar } = params;
        return cacheResult?.rows && !cacheResult.isStale && !moar;
    }

    // Check that the params passed to the fetch methods are valid and work together
    private validateFetchParams<T extends MastodonApiObject>(params: FetchParamsWithCacheData<T>): void {
        let { cacheKey, logger, maxId, maxIdForFetch, minIdForFetch, moar, skipCache } = params;
        logger = logger.tempLogger('validateFetchParams');

        if (moar && (skipCache || maxId)) {
            logger.warn(`skipCache=true AND moar or maxId set!`);
        }

        if (maxIdForFetch && minIdForFetch) {
            logger.logAndThrowError(`maxIdForFetch and minIdForFetch can't be used at same time!`, params);
        }

        // HASHTAG_TOOTS is a special case that doesn't use the cache and has no min/max ID that also spams logs
        if (cacheKey != CacheKey.HASHTAG_TOOTS) {
            const paramsToLog = removeKeys(params, PARAMS_TO_NOT_LOG, PARAMS_TO_NOT_LOG_IF_FALSE);

            if (this.shouldReturnCachedRows(params)) {
                return;
            } else if (paramsToLog.minIdForFetch || paramsToLog.maxIdForFetch) {
                logger.debug(`Incremental fetch from API to update stale cache:`, paramsToLog);
            } else {
                logger.trace(`Fetching data from API or cache w/params:`, paramsToLog);
            }
        }
    }

    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////

    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(logger: Logger, error: unknown, msg: string): void {
        logger.error(`${msg}. Error:`, error);
        if (isAccessTokenRevokedError(error)) throw error;
    }

    // Throw just a simple string as the error if it's a rate limit error; otherwise re-raise
    static throwSanitizedRateLimitError(error: unknown, msg: string): void {
        if (isRateLimitError(error)) {
            apiLogger.error(`Rate limit error:`, error);
            throw RATE_LIMIT_USER_WARNING;
        } else {
            apiLogger.logAndThrowError(msg, error);
        }
    }
};


// Populate the various fetch options with basic defaults
function fillInDefaultParams<T extends MastodonApiObject>(params: FetchParams<T>): FetchParamsWithDefaults<T> {
    let { cacheKey, isBackgroundFetch, logger, maxId, maxRecords, moar, skipCache, skipMutex } = params;
    const requestDefaults = config.api.data[cacheKey];
    const maxApiRecords = maxRecords || requestDefaults?.initialMaxRecords || MIN_RECORDS_FOR_FEATURE_SCORING;

    const withDefaults: FetchParamsWithDefaults<T> = {
        ...params,
        breakIf: params.breakIf || null,
        isBackgroundFetch: isBackgroundFetch || false,
        limit: Math.min(maxApiRecords, requestDefaults?.limit ?? config.api.defaultRecordsPerPage),
        logger: loggerForParams(params),
        maxId: maxId || null,
        maxRecords: maxApiRecords,
        maxCacheRecords: requestDefaults?.maxCacheRecords,
        moar: moar || false,
        processFxn: params.processFxn || null,
        skipCache: skipCache || false,
        skipMutex: skipMutex || false,
    };

    return withDefaults;
};


function loggerForParams<T extends MastodonApiObject>(params: Omit<FetchParams<T>, "fetch">): Logger {
    const { cacheKey, isBackgroundFetch, moar } = params;
    return getLogger(cacheKey, moar && "moar", isBackgroundFetch && "backgroundFetch");
}


// Return true if the error is an access token revoked error
export function isAccessTokenRevokedError(e: Error | unknown): boolean {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }

    return e.message.includes(ACCESS_TOKEN_REVOKED_MSG);
};


// Return true if the error is an access token revoked error
export function isRateLimitError(e: Error | unknown): boolean {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }

    return e.message.includes(RATE_LIMIT_ERROR_MSG);
};
