/*
 * Singleton class to wrap authenticated mastodon API calls to the user's home server
 * (unauthenticated calls are handled by the MastodonServer class).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
import { mastodon } from "masto";
import { Mutex, Semaphore } from 'async-mutex';

import Account from "./objects/account";
import Storage, { STORAGE_KEYS_WITH_ACCOUNTS, STORAGE_KEYS_WITH_TOOTS, STORAGE_KEYS_WITH_UNIQUE_IDS } from "../Storage";
import Toot, { SerializableToot, earliestTootedAt, mostRecentTootedAt, sortByCreatedAt } from './objects/toot';
import UserData from "./user_data";
import { ageInMS, ageString, mostRecent, quotedISOFmt, subtractSeconds, timelineCutoffAt } from "../helpers/time_helpers";
import { bracketed, extractDomain } from '../helpers/string_helpers';
import { CacheKey } from "../enums";
import { ComponentLogger } from "../helpers/log_helpers";
import { config, MIN_RECORDS_FOR_FEATURE_SCORING } from "../config";
import { findMinMaxId, truncateToConfiguredLength, uniquifyByProp } from "../helpers/collection_helpers";
import { lockExecution, logAndThrowError, WaitTime } from '../helpers/log_helpers';
import { repairTag } from "./objects/tag";
import { TrendingType } from '../enums';
import {
    type ApiMutex,
    type MastodonApiObject,
    type MastodonObjWithID,
    type MastodonTag,
    type MinMaxID,
    type StatusList,
} from "../types";
import { max } from "lodash";

// Error messages for MastoHttpError
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const RATE_LIMIT_ERROR_MSG = "Too many requests";  // MastoHttpError: Too many requests
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";
const LOG_PREFIX = 'API';

const apiLogger = new ComponentLogger(LOG_PREFIX, 'static');

type CachedRows<T> = {
    isStale: boolean;              // True if the cached data is stale
    minMaxId?: MinMaxID | null;    // If the request supports min/max ID, the min/max ID in the cache
    rows: T[];                     // Cached rows of API objects
    updatedAt: Date;               // Optional date when the cache was last updated
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
    logger?: ComponentLogger,  // Optional logger to use for logging API calls
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
};

// Same as FetchParams but with a few derived fields
interface FetchParamsWithCacheData<T extends MastodonApiObject> extends FetchParamsWithDefaults<T>, MinMaxIDParams {
    cacheResult: CachedRows<T> | null,
};

// Home timeline request params
//   - mergeTootsToFeed: fxn to call to merge the fetched Toots into the main feed
interface HomeTimelineParams extends MaxIdParams {
    mergeTootsToFeed: (toots: Toot[], logPrefix: string) => Promise<void>,
};


export default class MastoApi {
    static #instance: MastoApi;  // Singleton instance of MastoApi

    api: mastodon.rest.Client;
    homeDomain: string;
    logger: ComponentLogger;
    user: Account;
    userData?: UserData;  // Save UserData in the API object to avoid polling local storage over and over
    waitTimes: {[key in CacheKey]?: WaitTime} = {}; // Just for measuring performance (poorly)
    private mutexes: ApiMutex;  // Mutexes for blocking singleton requests (e.g. followed accounts)
    private requestSemphore = new Semaphore(config.api.maxConcurrentRequestsInitial); // Limit concurrency of search & tag requests

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

        // Initialize mutexes for each StorageKey
        this.mutexes = Object.keys(CacheKey).reduce((acc, key) => {
            acc[CacheKey[key as keyof typeof CacheKey]] = new Mutex();
            return acc;
        }, {} as ApiMutex);
    }

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags).
    // TODO: should there be a mutex? Only called by triggerFeedUpdate() which can only run once at a time
    async fetchHomeFeed(params: HomeTimelineParams): Promise<Toot[]> {
        let { maxId, maxRecords, mergeTootsToFeed, moar } = params;
        const cacheKey = CacheKey.HOME_TIMELINE_TOOTS;
        const logger = getLogger(cacheKey, moar ? "moar" : "initial");
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
            const lookbackSeconds = config.api.data[CacheKey.HOME_TIMELINE_TOOTS]?.lookbackForUpdatesMinutes! * 60;
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
                logger.debug(`Got ${newStatuses.length} new toots, ${allStatuses.length} total (${oldestTootStr}), now build`);
                const newToots = await Toot.buildToots(newStatuses, cacheKey);
                await mergeTootsToFeed(newToots, logger.logPrefix);
                allNewToots = allNewToots.concat(newToots)

                // Break the toot fetching loop if we encounter a toot older than cutoffAt
                if (oldestTootAt < cutoffAt) {
                    logger.log(`Halting fetch (${oldestTootStr} <= cutoff ${quotedISOFmt(cutoffAt)})`);
                    return true;
                }
            }
        }) as Toot[];

        homeTimelineToots = Toot.dedupeToots([...allNewToots, ...homeTimelineToots], cacheKey)
        let msg = `Fetched ${allNewToots.length} new toots ${ageString(startedAt)} (${oldestTootStr}`;
        logger.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        homeTimelineToots = sortByCreatedAt(homeTimelineToots).reverse(); // TODO: should we sort by score?
        homeTimelineToots = truncateToConfiguredLength(homeTimelineToots, config.toots.maxTimelineLength, logger.logPrefix);
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

    // Generic data getter for things we want to cache but require custom fetch logic
    //    - maxRecordsConfigKey: optional config key to use to truncate the number of records returned
    async getCacheableToots(
        fetch: () => Promise<mastodon.v1.Status[]>,
        key: CacheKey,
        maxRecords: number,
    ): Promise<Toot[]> {
        const logger = getLogger(key);
        const releaseMutex = await lockExecution(this.mutexes[key], logger.logPrefix);
        const startedAt = new Date();

        try {
            let toots = await Storage.getIfNotStale<Toot[]>(key);

            if (!toots) {
                const statuses = await fetch();
                logger.trace(`Retrieved ${statuses.length} Statuses ${ageString(startedAt)}`);
                toots = await Toot.buildToots(statuses, key);
                toots = truncateToConfiguredLength(toots, maxRecords, key);
                await Storage.set(key, toots);
            }

            return toots;
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
        return await this.getApiRecords<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            cacheKey: CacheKey.NOTIFICATIONS,
            ...(params || {})
        }) as mastodon.v1.Notification[];
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
        const releaseMutex = await lockExecution(this.mutexes[CacheKey.SERVER_SIDE_FILTERS], logger.logPrefix);
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

                logger.log(`Retrieved ${filters.length} records ${ageString(startTime)}:`, filters);
                await Storage.set(CacheKey.SERVER_SIDE_FILTERS, filters);
            }

            return filters;
        } finally {
            releaseMutex();
        }
    };

    // Get latest toots for a given tag using both the Search API and tag timeline API.
    // The two APIs give results with surprising little overlap (~80% of toots are unique)
    async getStatusesForTag(tag: MastodonTag, numToots?: number): Promise<mastodon.v1.Status[]> {
        numToots ||= config.trending.tags.numTootsPerTag;
        const startedAt = new Date();

        const tagToots = await Promise.all([
            this.searchForToots(tag.name, numToots),
            this.hashtagTimelineToots(tag, numToots),
        ]);

        logTrendingTagResults(`(getStatusesForTag(${tag.name}))`, "both hashtag searches", tagToots.flat(), startedAt);
        return tagToots.flat();
    }

    // Collect and fully populate / dedup a collection of toots for an array of Tags
    async getStatusesForTags(tags: MastodonTag[], numTootsPerTag?: number): Promise<mastodon.v1.Status[]> {
        this.logger.log(`(getStatusesForTags()) called for ${tags.length} tags:`, tags.map(t => t.name));
        const tagToots = await Promise.all(tags.map(tag => this.getStatusesForTag(tag, numTootsPerTag)));
        return tagToots.flat();
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
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    async hashtagTimelineToots(tag: MastodonTag, maxRecords?: number): Promise<Toot[]> {
        maxRecords = maxRecords || config.api.defaultRecordsPerPage;
        const logger = getLogger(CacheKey.HASHTAG_TOOTS, tag.name);
        const releaseSemaphore = await lockExecution(this.requestSemphore, logger.logPrefix);
        const startedAt = new Date();

        try {
            const toots = await this.getApiRecords<mastodon.v1.Status>({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                cacheKey: CacheKey.HASHTAG_TOOTS,  // This CacheKey is just for log prefixes + signaling how to serialize
                maxRecords: maxRecords,
                // hashtag timeline toots are not cached as a group, they're pulled in small amounts and used
                // to create other sets of toots from a lot of small requests, e.g. PARTICIPATED_TAG_TOOTS
                skipCache: true,
                // Concurrency is managed by the semaphore in this method not the normal mutexes
                skipMutex: true,
            });

            logger.trace(`Retrieved ${toots.length} toots ${ageString(startedAt)}`);
            return toots as Toot[];
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logger.logPrefix} Failed ${ageString(startedAt)}`);
            return [];
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
                logAndThrowError(msg, v1Instance);
            } else {
                logAndThrowError(`Failed to fetch Mastodon instance info from both V1 and V2 APIs`, err);
            }
        }
    }

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
            logAndThrowError(`${logger.logPrefix} got bad result for "${tootURI}"`, lookupResult);
        }

        const resolvedStatus = lookupResult.statuses[0];
        logger.trace(`found resolvedStatus for "${tootURI}":`, resolvedStatus);
        return Toot.build(resolvedStatus as mastodon.v1.Status);
    }

    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr: string, maxRecords?: number): Promise<mastodon.v1.Status[]> {
        maxRecords = maxRecords || config.api.defaultRecordsPerPage;
        const logger = getLogger(`searchForToots(${searchStr})`);
        const releaseSemaphore = await lockExecution(this.requestSemphore, logger.logPrefix);
        const query: mastodon.rest.v1.SearchParams = {limit: maxRecords, q: searchStr, type: TrendingType.STATUSES};
        logger.logPrefix += ` (semaphore)`;
        const startedAt = new Date();

        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            logger.trace(`Retrieved ${statuses.length} ${ageString(startedAt)}`);
            return statuses;
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logger.logPrefix} Failed ${ageString(startedAt)}`);
            return [];
        } finally {
            releaseSemaphore();
        }
    }

    reset(): void {
        this.logger.log(`Resetting MastoApi instance...`);
        this.setSemaphoreConcurrency(config.api.maxConcurrentRequestsInitial);
        this.userData = undefined;  // Clear the user data cache
        this.waitTimes = {};  // Reset the waiting timer
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
        logger ??= getLogger(cacheKey, 'getApiRecords()');

        // Lock mutex before checking cache (unless skipMutex is true)
        const releaseMutex = skipMutex ? null : await lockExecution(this.mutexes[cacheKey], logger.logPrefix);
        const completedParams = await this.addCacheDataToParams<T>({ ...inParams, logger });
        let { cacheResult, maxRecords } = completedParams;

        // If cache is fresh return it unless 'moar' flag is set (Storage.get() handled the deserialization of Toots etc.)
        if (cacheResult?.rows && !cacheResult.isStale && !moar) {
            releaseMutex?.();  // TODO: seems a bit dangerous to handle the mutex outside of try/finally...
            return cacheResult?.rows;
        }

        logger.trace(`Cache is stale or moar=true, proceeding to fetch from API w/ completedParams:`, completedParams);
        let cachedRows = cacheResult?.rows || [];
        let pageNumber = 0;
        let newRows: T[] = [];
        // Telemetry stuff that should be removed eventually
        this.waitTimes[cacheKey] ??= new WaitTime();
        this.waitTimes[cacheKey]!.markStart();

        try {
            for await (const page of fetch(this.buildParams(completedParams))) {
                this.waitTimes[cacheKey]!.markEnd(); // telemetry

                // the important stuff
                newRows = newRows.concat(page as T[]);
                pageNumber += 1;
                const shouldStop = breakIf ? (await breakIf(page, newRows)) : false;  // breakIf() must be called before we check the length of rows!
                const recordsSoFar = `${page.length} in page, ${newRows.length} records so far ${this.waitTimes[cacheKey]!.ageString()}`;

                if (newRows.length >= maxRecords || page.length == 0 || shouldStop) {
                    logger.debug(`Completing fetch at page ${pageNumber}, ${recordsSoFar}, shouldStop=${shouldStop}`);
                    break;
                } else {
                    const msg = `Retrieved page ${pageNumber} (${recordsSoFar})`;
                    (pageNumber % 5 == 0) ? logger.debug(msg) : logger.trace(msg);
                }

                // Reset timer to try to only measure the time spent waiting for the API to respond
                this.waitTimes[cacheKey]!.markStart();
            }
        } catch (e) {
            newRows = this.handleApiError<T>(completedParams, newRows, this.waitTimes[cacheKey]!.startedAt, e);
            cachedRows = [];  // Set cachedRows to empty because hanldeApiError() already handled the merge
        } finally {
            releaseMutex?.();
        }

        // If endpoint has unique IDs (e.g. Toots) then we merge the cached rows with the new ones
        // (they will be deduped in buildFromApiObjects() if needed)
        if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
            newRows = [...cachedRows, ...newRows];
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
        const fullParams = fillInBasicDefaults<T>({ ...params, logger });
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
                logger.info(`Getting MOAR data; loading backwards from minId in cache: "${minMaxIdParams.maxIdForFetch}"`);
            } else {
                // TODO: is this right? we used to return the cached data quickly if it was OK...
                minMaxIdParams.minIdForFetch = cacheResult.minMaxId.max;
                logger.info(`Incremental load possible; loading fwd from maxId in cache: "${minMaxIdParams.minIdForFetch}"`);
            }
        } else if (maxId) {
            logger.info(`loading backward from manually provided maxId: "${maxId}"`);
            minMaxIdParams.maxIdForFetch = maxId;  // If we have a manually provided maxId use it as the maxIdForFetch
        }

        // If 'moar' flag is set, add another unit of maxRecords to the row count we have now
        if (cacheResult && moar) {
            const newMaxRecords = maxRecords! + cacheResult.rows!.length;
            logger.info(`Increasing maxRecords to ${newMaxRecords} for MOAR request`);
        } else {
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

        return {
            isStale: cachedData.isStale,
            minMaxId: this.supportsMinMaxId(key) ? findMinMaxId(rows as MastodonObjWithID[]) : null,  // Only set if endpoint supports MinMaxId!
            rows,
            updatedAt: cachedData.updatedAt,
        };
    }

    // If the access token was not revoked we need to decide which of the rows we have to keep.
    // handleApiError() will make a decision about whether to use the cache, the new rows, or both
    // and return the appropriate rows and return the appropriate rows in a single array.
    // TODO: handle rate limiting errors
    private handleApiError<T extends MastodonApiObject>(
        params: FetchParamsWithCacheData<T>,
        rows: T[],
        startedAt: Date,
        err: Error | unknown,
    ): T[] {
        const { cacheResult, cacheKey, logger } = params;
        const cachedRows = cacheResult?.rows || [];
        let msg = `Error: "${err}" after pulling ${rows.length} rows (cache: ${cachedRows.length} rows).`;
        MastoApi.throwIfAccessTokenRevoked(err, `${logger.logPrefix} Failed ${ageString(startedAt)}. ${msg}`);

        // If endpoint doesn't support min/max ID and we have less rows than we started with use old rows
        // TODO: i think we can just check for the existence of minMaxId in cacheResult?
        if (!this.supportsMinMaxId(cacheKey)) {
            msg += ` Endpoint doesn't support incremental min/max ID.`;

            if (rows.length < cachedRows.length) {
                logger.warn(`${msg} Discarding new rows and returning old ones bc there's more of them.`);
                return cachedRows;
            } else {
                logger.warn(`${msg} Keeping the new rows, discarding cached rows bc there's more of them.`);
                return rows;
            }
        } else if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(cacheKey)) {
            logger.warn(`${msg} Merging cached rows with new rows.`);
            return [...cachedRows, ...rows];
        } else {
            logger.error(`Shouldn't be here! All endpoints either support min/max ID or unique IDs: ${msg}`);
            return rows;
        }
    }

    // Construct an Account or Toot object from the API object (otherwise just return the object)
    private buildFromApiObjects(key: CacheKey, objects: MastodonApiObject[], logger: ComponentLogger): MastodonApiObject[] {
        logger.trace(`(buildFromApiObjects) called for key "${key}" with ${objects.length} objects`);

        if (STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            const accounts = objects.map(o => Account.build(o as mastodon.v1.Account));
            return uniquifyByProp<MastodonObjWithID>(accounts, (obj) => obj.id, key);
        } else if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            const toots = objects.map(obj => obj instanceof Toot ? obj : Toot.build(obj as SerializableToot));
            return Toot.dedupeToots(toots, `${key} buildFromApiObjects`);
        } else if (STORAGE_KEYS_WITH_UNIQUE_IDS.includes(key)) {
            return uniquifyByProp<MastodonObjWithID>(objects as MastodonObjWithID[], (obj) => obj.id, key);
        } else {
            return objects;
        }
    }

    // Check that the params passed to the fetch methods are valid and work together
    private validateFetchParams<T extends MastodonApiObject>(params: FetchParamsWithCacheData<T>): void {
        let { logger, maxId, maxIdForFetch, minIdForFetch, moar, skipCache } = params;
        logger.trace(`(validateFetchParams()) params:`, params);

        if (moar && (skipCache || maxId)) {
            logger.warn(`skipCache=true AND moar or maxId set!`);
        }

        if (maxIdForFetch && minIdForFetch) {
            logAndThrowError(`Both maxIdForFetch="${maxIdForFetch}" and minIdForFetch="${minIdForFetch}" set!`, params);
        }
    }

    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////

    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(error: unknown, msg: string): void {
        apiLogger.error(`${msg}. Error:`, error);
        if (isAccessTokenRevokedError(error)) throw error;
    }

    // Throw just a simple string as the error if it's a rate limit error; otherwise re-raise
    static throwSanitizedRateLimitError(error: unknown, msg: string): void {
        if (isRateLimitError(error)) {
            apiLogger.error(`Rate limit error:`, error);
            throw RATE_LIMIT_USER_WARNING;
        } else {
            logAndThrowError(msg, error);
        }
    }
};


// Populate the various fetch options with basic defaults
function fillInBasicDefaults<T extends MastodonApiObject>(params: FetchParams<T>): FetchParamsWithDefaults<T> {
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
        moar: moar || false,
        processFxn: params.processFxn || null,
        skipCache: skipCache || false,
        skipMutex: skipMutex || false,
    };

    return withDefaults;
}


// logs prefixed by [API]
function getLogger(subtitle?: string, subsubtitle?: string): ComponentLogger {
    return new ComponentLogger(bracketed(LOG_PREFIX), subtitle, subsubtitle);
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


// TODO: get rid of this eventually
const logTrendingTagResults = (
    logPrefix: string,
    searchMethod: string,
    toots: mastodon.v1.Status[] | Toot[],
    startedAt: Date
): void => {
    let msg = `${logPrefix} ${searchMethod} found ${toots.length} toots ${ageString(startedAt)}`;
    msg += ` (oldest=${quotedISOFmt(earliestTootedAt(toots))}, newest=${quotedISOFmt(mostRecentTootedAt(toots))}):`
    apiLogger.debug(msg);
};
