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
import { CacheKey, TagTootsCacheKey } from "../enums";
import { config, MIN_RECORDS_FOR_FEATURE_SCORING } from "../config";
import { extractDomain } from '../helpers/string_helpers';
import { lockExecution, WaitTime } from '../helpers/log_helpers';
import { Logger } from '../helpers/logger';
import { repairTag } from "./objects/tag";
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
    type ApiCacheKey,
    type ApiMutex,
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
interface ApiParams {
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
//   - label: if it's a StorageKey use it for caching, if it's a string just use it for logging
//   - processFxn: optional function to process the object before storing and returning it
//   - skipCache: if true, don't use cached data and don't lock the endpoint mutex when making requests
interface FetchParams<T extends MastodonApiObject> extends MaxIdParams {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    cacheKey: CacheKey,  // Mutex will be skipped if label is a string not a StorageKey,
    skipMutex?: boolean,
    breakIf?: ((pageOfResults: T[], allResults: T[]) => Promise<true | undefined>) | null ,
    processFxn?: ((obj: T) => void) | null,
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

// constants
const ALL_CACHE_KEYS = [...Object.values(CacheKey), ...Object.values(TagTootsCacheKey)];
// Error messages for MastoHttpError
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const RATE_LIMIT_ERROR_MSG = "Too many requests";  // MastoHttpError: Too many requests
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";
// Logging
const LOG_PREFIX = 'API';
const PARAMS_TO_NOT_LOG: FetchParamName[] = ["breakIf", "fetch", "logger", "processFxn"];
const PARAMS_TO_NOT_LOG_IF_FALSE: FetchParamName[] = ["skipCache", "skipMutex", "moar"];

// Loggers prefixed by [API]
const getLogger = Logger.logBuilder(LOG_PREFIX);
const apiLogger = getLogger();


export default class MastoApi {
    static #instance: MastoApi;  // Singleton instance of MastoApi

    api: mastodon.rest.Client;
    apiErrors: Error[] = [];  // Errors encountered while using the API
    homeDomain: string;
    logger: Logger;
    user: Account;
    userData?: UserData;  // Save UserData in the API object to avoid polling local storage over and over
    waitTimes: {[key in CacheKey]?: WaitTime} = {}; // Just for measuring performance (poorly)
    private mutexes: ApiMutex;  // Mutexes for blocking singleton requests (e.g. followed accounts)
    private requestSemphore = new Semaphore(config.api.maxConcurrentHashtagRequests); // Limit concurrency of search & hashtag requests

    static init(api: mastodon.rest.Client, user: Account): void {
        if (MastoApi.#instance) {
            apiLogger.warn(`MastoApi instance already initialized...`);
            return;
        }

        apiLogger.log(`Initializing MastoApi instance with user:`, user.acct);
        MastoApi.#instance = new MastoApi(api, user);
    }

    public static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }

    private constructor(api: mastodon.rest.Client, user: Account) {
        this.api = api;
        this.user = user;
        this.homeDomain = extractDomain(user.url);
        this.logger = getLogger();
        this.reset();

        // Initialize mutexes for each StorageKey
        this.mutexes = ALL_CACHE_KEYS.reduce((mutexes, key) => {
            mutexes[key] = new Mutex();
            return mutexes;
        }, {} as ApiMutex);
    }

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags).
    // TODO: should there be a mutex? Only called by triggerFeedUpdate() which can only run once at a time
    async fetchHomeFeed(params: HomeTimelineParams): Promise<Toot[]> {
        let { maxId, maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = CacheKey.HOME_TIMELINE_TOOTS;
        const logger = getLogger(...[cacheKey as string].concat(moar ? ["moar"] : []));
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
            logger,
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
        const releaseMutex = await lockExecution(this.mutexes[cacheKey], logger);
        const startedAt = new Date();

        try {
            let toots = await Storage.getIfNotStale<Toot[]>(cacheKey);

            if (!toots) {
                const statuses = await fetchStatuses();
                logger.trace(`Retrieved ${statuses.length} Statuses ${ageString(startedAt)}`);
                toots = await Toot.buildToots(statuses, cacheKey);
                toots = truncateToConfiguredLength(toots, maxRecords, logger);
                await Storage.set(cacheKey, toots);
            }

            return toots;
        } catch (err) {
            // TODO: the hacky cast is because ApiCacheKey is broader than CacheKey
            this.handleApiError({ cacheKey: cacheKey as CacheKey, logger }, [], startedAt, err);
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
        const releaseMutex = await lockExecution(this.mutexes[CacheKey.SERVER_SIDE_FILTERS], logger);
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
    async getUserData(): Promise<UserData> {
        // TODO: the staleness check probably belongs in the UserData class
        if (!this.userData || (await this.userData.isDataStale())) {
            this.userData = await UserData.build();
        }

        return this.userData;
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

    async lockAllMutexes(): Promise<ConcurrencyLockRelease[]> {
        apiLogger.log(`lockAllMutexes() called, locking all mutexes...`);

        return await Promise.all(
            Object.values(this.mutexes).map(mutex => lockExecution(mutex, apiLogger, 'lockAllMutexes()'))
        );
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
        if (this.mutexes) this.logger.log(`Resetting MastoApi instance...`);
        this.apiErrors = [];
        this.userData = undefined;  // Clear the user data cache
        this.setSemaphoreConcurrency(config.api.maxConcurrentHashtagRequests);

        this.waitTimes = ALL_CACHE_KEYS.reduce((waitTimes, key) => {
            waitTimes[key] = new WaitTime();
            return waitTimes;
        }, {} as {[key in ApiCacheKey]: WaitTime});
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

    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    private async getApiRecords<T extends MastodonApiObject>(inParams: FetchParams<T>): Promise<MastodonApiObject[]> {
        let { breakIf, cacheKey, fetch, logger, moar, processFxn, skipCache, skipMutex } = inParams;
        logger ??= getLogger(cacheKey, 'getApiRecords');

        // Lock mutex before checking cache (unless skipMutex is true)
        const releaseMutex = skipMutex ? null : await lockExecution(this.mutexes[cacheKey], logger);
        const completeParams = await this.addCacheDataToParams<T>({ ...inParams, logger });
        let { cacheResult, maxCacheRecords, maxRecords } = completeParams;

        // If cache is fresh return it unless 'moar' flag is set (Storage.get() handled the deserialization of Toots etc.)
        if (this.shouldReturnCachedRows(completeParams)) {
            releaseMutex?.();  // TODO: seems a bit dangerous to handle the mutex outside of try/finally...
            return cacheResult!.rows;
        }

        let cachedRows = cacheResult?.rows || [];
        let pageNumber = 0;
        let newRows: T[] = [];

        try {
            // Telemetry stuff that should be removed eventually
            this.waitTimes[cacheKey] ||= new WaitTime();
            this.waitTimes[cacheKey]!.markStart();

            for await (const page of fetch(this.buildParams(completeParams))) {
                this.waitTimes[cacheKey]!.markEnd(); // telemetry
                const requestSeconds = this.waitTimes[cacheKey]!.ageInSeconds() || 0;

                // the important stuff
                newRows = newRows.concat(page as T[]);
                pageNumber += 1;
                const shouldStop = breakIf ? (await breakIf(page, newRows)) : false;  // breakIf() must be called before we check the length of rows!
                const recordsSoFar = `${page.length} in page, ${newRows.length} records so far ${this.waitTimes[cacheKey]!.ageString()}`;

                if (newRows.length >= maxRecords || page.length == 0 || shouldStop) {
                    logger.debug(`Completing fetch at page ${pageNumber}, ${recordsSoFar}, shouldStop=${shouldStop}`);
                    break;
                } else if (requestSeconds > config.api.maxSecondsPerPage) {
                    throw new Error(`Stopped fetch at page ${pageNumber}, ${recordsSoFar}. Took too long (${requestSeconds}s)`);
                } else {
                    const msg = `Retrieved page ${pageNumber} (${recordsSoFar})`;
                    (pageNumber % 5 == 0) ? logger.debug(msg) : logger.trace(msg);
                }

                // Reset timer to try to only measure the time spent waiting for the API to respond
                this.waitTimes[cacheKey]!.markStart();
            }
        } catch (e) {
            if (!this.waitTimes[cacheKey]) {
                logger.warn(`waitTimes[${cacheKey}] is undefined!`);
                this.waitTimes[cacheKey] = new WaitTime();
                this.waitTimes[cacheKey]!.markStart();
            }

            newRows = this.handleApiError<T>(completeParams, newRows, this.waitTimes[cacheKey]!.startedAt, e);
            cachedRows = [];  // Set cachedRows to empty because hanldeApiError() already handled the merge
        } finally {
            releaseMutex?.();
        }

        // If endpoint has unique IDs (e.g. Toots) then we merge the cached rows with the new ones
        // (they will be deduped in buildFromApiObjects() if needed)
        if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
            newRows = [...cachedRows, ...newRows];
        }

        // If we have a maxCacheRecords limit, truncate the new rows to that limit
        if (maxCacheRecords && newRows.length > maxCacheRecords) {
            try {
                logger.warn(`Truncating ${newRows.length} rows to maxCacheRecords=${maxCacheRecords}`);
                newRows = truncateToConfiguredLength(sortObjsByCreatedAt(newRows as WithCreatedAt[]), maxCacheRecords, logger);
            } catch (err) {
                logger.error(`Error truncating new rows to maxCacheRecords=${maxCacheRecords}`, err);
            }
        }

        const objs = this.buildFromApiObjects(cacheKey, newRows, logger);
        if (processFxn) objs.forEach(obj => obj && processFxn!(obj as T));
        if (!skipCache) await Storage.set(cacheKey, objs);
        return objs;
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
        params: FetchParams<T>
    ): Promise<FetchParamsWithCacheData<T>> {
        let { cacheKey, logger, maxId, moar, skipCache } = params;
        logger ??= getLogger(cacheKey, moar ? "moar" : "initial");
        const fullParams = fillInDefaultParams<T>({ ...params, logger });
        const { maxRecords } = fullParams;

        // Fetch from cache unless skipCache is true
        const cacheResult = skipCache ? null : (await this.getCachedRows<T>(cacheKey));
        const minMaxIdParams: MinMaxIDParams = {maxIdForFetch: null, minIdForFetch: null};

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
            } else {
                // TODO: is this right? we used to return the cached data quickly if it was OK...
                // TODO: at the very least we are filling in this value when it is only used for updating stale data...
                minMaxIdParams.minIdForFetch = cacheResult.minMaxId.max;

                if (cacheResult.isStale) {
                    logger.info(`Incremental update of stale data from cached maxId "${minMaxIdParams.minIdForFetch}"`);
                }
            }
        } else if (maxId) {
            logger.info(`Loading backward from manually provided maxId: "${maxId}"`);
            minMaxIdParams.maxIdForFetch = maxId;  // If we have a manually provided maxId use it as the maxIdForFetch
        }

        // If 'moar' flag is set, add another unit of maxRecords to the row count we have now
        if (cacheResult && moar) {
            const newMaxRecords = maxRecords! + cacheResult.rows!.length;
            logger.info(`Increasing maxRecords for MOAR_DATA to ${newMaxRecords}`);
        }

        const completedParams: FetchParamsWithCacheData<T> = {
            ...minMaxIdParams,
            ...fullParams,
            cacheResult,
            maxRecords
        };

        this.validateFetchParams<T>(completedParams);
        return completedParams;
    }

    // Load data from the cache and make some inferences. Thin wrapper around Storage.getWithStaleness()
    private async getCachedRows<T extends MastodonApiObject>(key: CacheKey): Promise<CachedRows<T> | null> {
        const cachedData = await Storage.getWithStaleness(key);
        if (!cachedData) return null;
        const rows = cachedData?.obj as T[];

        // NOTE: Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
        // or future. For a while we used a small offset to the list of toots sorted by created_at instead
        // of the actual min/max.
        return {
            isStale: cachedData.isStale,
            // minMaxId is not returned  if endpoint doesn't support min/max ID API requests (even if it exists)
            minMaxId: this.supportsMinMaxId(key) ? findMinMaxId(rows as MastodonObjWithID[]) : null,
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
        startedAt: Date,
        err: Error | unknown,
    ): T[] {
        let { cacheKey, cacheResult, logger } = params;
        cacheKey ??= CacheKey.HOME_TIMELINE_TOOTS;  // TODO: this is a hack to avoid undefined cacheKey
        logger ??= getLogger(cacheKey, 'handleApiError');
        const cachedRows = cacheResult?.rows || [];
        let msg = `"${err} After pulling ${rows.length} rows (cache: ${cachedRows.length} rows).`;
        this.apiErrors.push(new Error(logger.str(msg), {cause: err}));
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
            return Toot.dedupeToots(toots, logger.tempLogger(`buildFromApiObjects()`));
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

        if (moar && (skipCache || maxId)) {
            logger.warn(`skipCache=true AND moar or maxId set!`);
        }

        if (maxIdForFetch && minIdForFetch) {
            this.logger.logAndThrowError(`maxIdForFetch and minIdForFetch can't be used at same time!`, params);
        }

        // HASHTAG_TOOTS is a special case that doesn't use the cache and has no min/max ID that also spams logs
        if (cacheKey != CacheKey.HASHTAG_TOOTS) {
            const paramsToLog = removeKeys(params, PARAMS_TO_NOT_LOG, PARAMS_TO_NOT_LOG_IF_FALSE);

            if (this.shouldReturnCachedRows(params)) {
                logger.trace(`Returning cached rows w/params:`, paramsToLog);
            } else if (paramsToLog.minIdForFetch || paramsToLog.maxIdForFetch) {
                logger.debug(`Incremental fetch from API to update cache:`, paramsToLog);
            } else {
                logger.trace(`Fetching new data from API w/params:`, paramsToLog);
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
    let { cacheKey, logger, maxId, maxRecords, moar, skipCache, skipMutex } = params;
    const requestDefaults = config.api.data[cacheKey];
    const maxApiRecords = maxRecords || requestDefaults?.initialMaxRecords || MIN_RECORDS_FOR_FEATURE_SCORING;

    const withDefaults: FetchParamsWithDefaults<T> = {
        ...params,
        breakIf: params.breakIf || null,
        limit: Math.min(maxApiRecords, requestDefaults?.limit ?? config.api.defaultRecordsPerPage),
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
};


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
