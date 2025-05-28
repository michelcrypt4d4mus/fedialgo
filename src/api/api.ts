/*
 * Singleton class to wrap authenticated mastodon API calls to the user's home server
 * (unauthenticated calls are handled by the MastodonServer class).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
import { mastodon } from "masto";
import { Mutex, Semaphore } from 'async-mutex';

import Account from "./objects/account";
import Storage, { STORAGE_KEYS_WITH_ACCOUNTS, STORAGE_KEYS_WITH_TOOTS } from "../Storage";
import Toot, { SerializableToot, earliestTootedAt, mostRecentTootedAt, sortByCreatedAt } from './objects/toot';
import UserData from "./user_data";
import { ageString, mostRecent, quotedISOFmt, subtractSeconds, timelineCutoffAt } from "../helpers/time_helpers";
import { ApiMutex, CacheKey, MastodonApiObject, MastodonObjWithID, MastodonTag, StatusList } from "../types";
import { bracketed, extractDomain } from '../helpers/string_helpers';
import { config, MIN_RECORDS_FOR_FEATURE_SCORING } from "../config";
import { findMinMaxId, truncateToConfiguredLength } from "../helpers/collection_helpers";
import { lockExecution, logAndThrowError, traceLog } from '../helpers/log_helpers';
import { repairTag } from "./objects/tag";
import { TrendingType } from "./mastodon_server";

const DEFAULT_BREAK_IF = async (pageOfResults: any[], allResults: any[]) => undefined;

// Error messages for MastoHttpError
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const RATE_LIMIT_ERROR_MSG = "Too many requests";  // MastoHttpError: Too many requests
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";

// Generic params for MastoApi methods that support backfilling via "moar" flag
//   - maxId: optional maxId to use for pagination
//   - maxRecords: optional max number of records to fetch
//   - skipCache: if true, don't use cached data
interface ApiParams {
    maxRecords?: number,
    moar?: boolean,
    skipCache?: boolean,
}

// Generic params that apply to a lot of methods in the MastoApi class
//   - moar: if true, continue fetching from the max_id found in the cache
interface MaxIdParams extends ApiParams {
    maxId?: string | number,
};

// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
//   - breakIf: fxn to call to check if we should fetch more pages, defaults to DEFAULT_BREAK_IF
//   - fetch: the data fetching function to call with params
//   - label: if it's a StorageKey use it for caching, if it's a string just use it for logging
//   - processFxn: optional function to process the object before storing and returning it
//   - skipCache: if true, don't use cached data and don't lock the endpoint mutex when making requests
interface FetchParams<T> extends MaxIdParams {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    cacheKey: CacheKey,  // Mutex will be skipped if label is a string not a StorageKey,
    skipMutex?: boolean,
    breakIf?: (pageOfResults: T[], allResults: T[]) => Promise<true | undefined>,
    processFxn?: (obj: T) => void,
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
    user: Account;
    userData?: UserData;  // Save UserData in the API object to avoid polling local storage over and over
    private mutexes: ApiMutex;  // Mutexes for blocking singleton requests (e.g. followed accounts)
    private requestSemphore = new Semaphore(config.api.maxConcurrentRequestsInitial); // Limit concurrency of search & tag requests

    // URL for tag on the user's homeserver
    tagUrl = (tag: MastodonTag | string) => `${this.endpointURL(TrendingType.TAGS)}/${typeof tag === "string" ? tag : tag.name}`;
    endpointURL = (endpoint: string) => `https://${this.homeDomain}/${endpoint}`;

    static init(api: mastodon.rest.Client, user: Account): void {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }

        console.log(`[API] Initializing MastoApi instance with user:`, user.acct);
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
        const logPrefix = bracketed(cacheKey);
        const startedAt = new Date();

        let homeTimelineToots = await Storage.getCoerced<Toot>(cacheKey);
        let allNewToots: Toot[] = [];
        let cutoffAt = timelineCutoffAt();
        let oldestTootStr = "no oldest toot";

        if (moar) {
            const minMaxId = findMinMaxId(homeTimelineToots);
            if (minMaxId) maxId = minMaxId.min;  // Use the min ID in the cache as the maxId for the MOAR request
            console.log(`${logPrefix} Fetching more old toots (found min ID ${maxId})`);
        } else {
            // Look back additional lookbackForUpdatesMinutes minutes to catch new updates and edits to toots
            const maxTootedAt = mostRecentTootedAt(homeTimelineToots);
            const lookbackSeconds = config.api.data[CacheKey.HOME_TIMELINE_TOOTS]?.lookbackForUpdatesMinutes! * 60;
            cutoffAt = maxTootedAt ? subtractSeconds(maxTootedAt, lookbackSeconds) : timelineCutoffAt();
            cutoffAt = mostRecent(timelineCutoffAt(), cutoffAt)!;
            console.debug(`${logPrefix} maxTootedAt: ${quotedISOFmt(maxTootedAt)}, maxId: ${maxId}, cutoffAt: ${quotedISOFmt(cutoffAt)}`);
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
                    console.warn(`${logPrefix} No new statuses in page of ${newStatuses.length} toots, halting`);
                    return true;
                }

                oldestTootStr = `oldest toot: ${quotedISOFmt(oldestTootAt)}`;
                console.debug(`${logPrefix} Got ${newStatuses.length} new toots, ${allStatuses.length} total (${oldestTootStr})`);
                const newToots = await Toot.buildToots(newStatuses, cacheKey);
                await mergeTootsToFeed(newToots, logPrefix);
                allNewToots = allNewToots.concat(newToots)

                // Break the toot fetching loop if we encounter a toot older than cutoffAt
                if (oldestTootAt < cutoffAt) {
                    console.log(`${logPrefix} Halting fetch (${oldestTootStr} <= cutoff ${quotedISOFmt(cutoffAt)})`);
                    return true;
                }
            }
        }) as Toot[];

        homeTimelineToots = Toot.dedupeToots([...allNewToots, ...homeTimelineToots], cacheKey)
        let msg = `${logPrefix} Fetched ${allNewToots.length} new toots ${ageString(startedAt)} (${oldestTootStr}`;
        console.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        homeTimelineToots = sortByCreatedAt(homeTimelineToots).reverse(); // TODO: should we sort by score?
        homeTimelineToots = truncateToConfiguredLength(homeTimelineToots, config.toots.maxTimelineLength, logPrefix);
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
        const releaseMutex = await lockExecution(this.mutexes[key], key);
        const startedAt = new Date();

        try {
            let toots = await Storage.getIfNotStale<Toot[]>(key);

            if (!toots) {
                const statuses = await fetch();
                traceLog(`${bracketed(key)} Retrieved ${statuses.length} Statuses ${ageString(startedAt)}`);
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
        const logPrefix = bracketed(CacheKey.SERVER_SIDE_FILTERS);
        const releaseMutex = await lockExecution(this.mutexes[CacheKey.SERVER_SIDE_FILTERS], logPrefix);
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

                console.log(`${logPrefix} Retrieved ${filters.length} records ${ageString(startTime)}:`, filters);
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

        logTrendingTagResults(`[getStatusesForTag(#${tag.name})]`, "both hashtag searches", tagToots.flat(), startedAt);
        return tagToots.flat();
    }

    // Collect and fully populate / dedup a collection of toots for an array of Tags
    async getStatusesForTags(tags: MastodonTag[], numTootsPerTag?: number): Promise<mastodon.v1.Status[]> {
        console.log(`[getStatusesForTags()] called for ${tags.length} tags:`, tags.map(t => t.name));
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
        const logPrefix = `[hashtagTimelineToots("#${tag.name}")]`;
        const releaseSemaphore = await lockExecution(this.requestSemphore, logPrefix);
        const startedAt = new Date();

        try {
            const toots = await this.getApiRecords<mastodon.v1.Status>({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                cacheKey: CacheKey.HASHTAG_TOOTS,
                maxRecords: maxRecords,
                skipCache: true,
                skipMutex: true,
            });

            traceLog(`${logPrefix} Retrieved ${toots.length} toots ${ageString(startedAt)}`);
            return toots as Toot[];
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${ageString(startedAt)}`);
            return [];
        } finally {
            releaseSemaphore();
        }
    }

    // Retrieve the user's home instance configuration from the API
    async instanceInfo(): Promise<mastodon.v2.Instance | mastodon.v1.Instance> {
        try {
            return await this.api.v2.instance.fetch();
        } catch (err) {
            console.error(`[MastoApi] Failed to fetch user's instance info, trying V1 API:`, err);
            return await this.api.v1.instance.fetch();
        }
    }

    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot: Toot): Promise<Toot> {
        const logPrefix = `[API resolveToot()]`;
        const tootURI = toot.realURI();
        const urlDomain = extractDomain(tootURI);
        traceLog(`${logPrefix} called for`, toot);
        if (urlDomain == this.homeDomain) return toot;
        const lookupResult = await this.api.v2.search.list({q: tootURI, resolve: true});

        if (!lookupResult?.statuses?.length) {
            logAndThrowError(`${logPrefix} got bad result for "${tootURI}"`, lookupResult);
        }

        const resolvedStatus = lookupResult.statuses[0];
        traceLog(`${logPrefix} found resolvedStatus for "${tootURI}":`, resolvedStatus);
        return Toot.build(resolvedStatus as mastodon.v1.Status);
    }

    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr: string, maxRecords?: number): Promise<mastodon.v1.Status[]> {
        maxRecords = maxRecords || config.api.defaultRecordsPerPage;
        let logPrefix = `[API searchForToots("${searchStr}")]`;
        const releaseSemaphore = await lockExecution(this.requestSemphore, logPrefix);
        const query: mastodon.rest.v1.SearchParams = {limit: maxRecords, q: searchStr, type: TrendingType.STATUSES};
        logPrefix += ` (semaphore)`;
        const startedAt = new Date();

        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            traceLog(`${logPrefix} Retrieved ${statuses.length} ${ageString(startedAt)}`);
            return statuses;
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${ageString(startedAt)}`);
            return [];
        } finally {
            releaseSemaphore();
        }
    }

    // After the initial load we don't need to have massive concurrency and in fact it can be a big resource
    // drain switching back to the browser window, which triggers a lot of background requests
    // TODO: should this call this.requestSemphore.setValue() instead? https://www.npmjs.com/package/async-mutex
    setSemaphoreConcurrency(concurrency: number): void {
        console.log(`[MastoApi] Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new Semaphore(concurrency);
    }

    /////////////////////////////
    //     Private Methods     //
    /////////////////////////////

    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    private async getApiRecords<T extends MastodonApiObject>(params: FetchParams<T>): Promise<MastodonApiObject[]> {
        let { breakIf, cacheKey, fetch, maxId, maxRecords, moar, processFxn, skipCache, skipMutex } = params;
        let logPfx = `${bracketed(cacheKey)}`;
        if (moar && (skipCache || maxId)) console.warn(`${logPfx} skipCache=true AND moar or maxId set`);

        // Parse params and set defaults
        const requestDefaults = config.api.data[cacheKey];
        maxRecords ??= requestDefaults?.initialMaxRecords ?? MIN_RECORDS_FOR_FEATURE_SCORING;
        const limit = Math.min(maxRecords, requestDefaults?.limit || config.api.defaultRecordsPerPage);  // max records per page
        breakIf ??= DEFAULT_BREAK_IF;
        let minId: string | undefined; // Used for incremental loading when data is stale (if supported)

        // Skip mutex for requests that aren't trying to get at the same data
        const releaseMutex = skipMutex ? null : await lockExecution(this.mutexes[cacheKey], logPfx);
        const startedAt = new Date();
        let pageNumber = 0;
        let rows: T[] = [];

        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedData = await Storage.getWithStaleness(cacheKey);

                if (cachedData?.obj) {
                    // Return the cachedRows if they exist, the data is not stale, and moar is false
                    const cachedRows = cachedData.obj as T[];
                    if (!cachedData.isStale && !moar) return cachedRows;
                    const minMaxId = findMinMaxId(cachedRows as MastodonObjWithID[]);

                    if (moar) {
                        maxRecords = maxRecords + cachedRows.length; // Add another unit of maxRecords to the rows we have now
                    }

                    // If maxId is supported then we find the minimum ID in the cached data use it as the next maxId.
                    if (requestDefaults?.supportsMinMaxId && minMaxId) {
                        rows = cachedRows;

                        // If we're pulling "moar" old data, use the min ID of the cache as the request maxId
                        // If we're incrementally updating stale data, use the max ID of the cache as the request minId
                        if (moar) {
                            maxId = minMaxId.min;
                            console.debug(`${logPfx} Getting MOAR old data; loading backwards from maxId ${maxId}`);
                        } else {
                            minId = minMaxId.max;
                            console.debug(`${logPfx} Stale data; attempting incremental load from minId ${minId}`);
                        }
                    } else {
                        // If maxId isn't supported then we don't start with the cached data in the 'rows' array
                        let msg = `${logPfx} maxId not supported or no cache, ${cachedRows.length} records, minMaxId:`;
                        console.debug(msg, minMaxId, `, maxRecords=${maxRecords}\nrequestDefaults:`, requestDefaults);
                    }
                };
            }

            traceLog(`${logPfx} fetchData() params w/defaults:`, {...params, limit, minId, maxId, maxRecords});

            for await (const page of fetch(this.buildParams(limit, minId, maxId))) {
                rows = rows.concat(page as T[]);
                pageNumber += 1;
                const shouldStop = await breakIf(page, rows);  // Must be called before we check the length of rows!
                const recordsSoFar = `${page.length} in page, ${rows.length} records so far ${ageString(startedAt)}`;

                if (rows.length >= maxRecords || page.length == 0 || shouldStop) {
                    console.debug(`${logPfx} Completing fetch at page ${pageNumber}, ${recordsSoFar}, shouldStop=${shouldStop}`);
                    break;
                } else {
                    const msg = `${logPfx} Retrieved page ${pageNumber} (${recordsSoFar})`;
                    (pageNumber % 5 == 0) ? console.debug(msg) : traceLog(msg);
                }
            }
        } catch (e) {
            // TODO: handle rate limiting errors
            // If the access token was not revoked whatever rows we've retrieved will be returned
            MastoApi.throwIfAccessTokenRevoked(e, `${logPfx} Failed ${ageString(startedAt)}, have ${rows.length} rows`);
        } finally {
            releaseMutex?.();
        }

        const objs = this.buildFromApiObjects(cacheKey, rows);
        if (processFxn) objs.forEach(obj => obj && processFxn!(obj as T));
        if (!skipCache) await Storage.set(cacheKey, objs);
        return objs;
    }

    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    private buildParams(
        limit: number,
        minId?: number | string,
        maxId?: number | string,
    ): mastodon.DefaultPaginationParams {
        let params: mastodon.DefaultPaginationParams = {limit: limit};
        if (minId) params = {...params, minId: `${minId}`};
        if (maxId) params = {...params, maxId: `${maxId}`};
        // if (logPfx) traceLog(`${logPfx} Fetching with params:`, params);
        return params as mastodon.DefaultPaginationParams;
    }

    // Construct an Account or Toot object from the API object (otherwise just return the object)
    private buildFromApiObjects(key: CacheKey, objects: MastodonApiObject[]): MastodonApiObject[] {
        if (STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            return objects.map(o => Account.build(o as mastodon.v1.Account));  // TODO: dedupe accounts?
        } else if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            const toots = objects.map(obj => obj instanceof Toot ? obj : Toot.build(obj as SerializableToot));
            return Toot.dedupeToots(toots, `${key} buildFromApiObjects`);
        } else {
            return objects;
        }
    }

    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////

    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(error: unknown, msg: string): void {
        console.error(`${msg}. Error:`, error);
        if (isAccessTokenRevokedError(error)) throw error;
    }

    // Throw just a simple string as the error if it's a rate limit error; otherwise re-raise
    static throwSanitizedRateLimitError(error: unknown, msg: string): void {
        if (isRateLimitError(error)) {
            console.error(`Rate limit error:`, error);
            throw RATE_LIMIT_USER_WARNING;
        } else {
            logAndThrowError(msg, error);
        }
    }
};


// Return true if the error is an access token revoked error
export function isAccessTokenRevokedError(e: Error | unknown): boolean {
    if (!(e instanceof Error)) {
        console.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }

    return e.message.includes(ACCESS_TOKEN_REVOKED_MSG);
};


// Return true if the error is an access token revoked error
export function isRateLimitError(e: Error | unknown): boolean {
    if (!(e instanceof Error)) {
        console.warn(`error 'e' is not an instance of Error:`, e);
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
    console.debug(msg);
};
