/*
 * Singleton class to wrap authenticated mastodon API calls to the user's home server
 * (unauthenticated calls are handled by the MastodonServer class).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
import { mastodon } from "masto";
import { Mutex, Semaphore } from 'async-mutex';

import Account from "./objects/account";
import Storage, { STORAGE_KEYS_WITH_ACCOUNTS, STORAGE_KEYS_WITH_TOOTS} from "../Storage";
import Toot, { earliestTootedAt, mostRecentTootedAt } from './objects/toot';
import UserData from "./user_data";
import { ageString, mostRecent, quotedISOFmt, subtractSeconds, timelineCutoffAt } from "../helpers/time_helpers";
import { ApiMutex, MastodonApiObject, MastodonObjWithID, MastodonTag, StatusList, StorageKey } from "../types";
import { bracketed, extractDomain } from '../helpers/string_helpers';
import { Config, ConfigType } from "../config";
import { findMinId, truncateToConfiguredLength } from "../helpers/collection_helpers";
import { lockExecution, logAndThrowError, traceLog } from '../helpers/log_helpers';
import { repairTag } from "./objects/tag";

export const INSTANCE = "instance";
export const LINKS = "links";
export const STATUSES = "statuses";
export const TAGS = "tags";

const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const LOOKBACK_SECONDS = Config.lookbackForUpdatesMinutes * 60;
const DEFAULT_BREAK_IF = async (pageOfResults: any[], allResults: any[]) => undefined;

type BatchSizes = {[key in StorageKey]?: number};

const BATCH_SIZES: BatchSizes = {
    [StorageKey.FOLLOWED_ACCOUNTS]: 80,     // https://docs.joinmastodon.org/methods/accounts/#following
    [StorageKey.FOLLOWED_TAGS]: 100,        // https://docs.joinmastodon.org/methods/followed_tags/
    [StorageKey.RECENT_NOTIFICATIONS]: 80,  // https://docs.joinmastodon.org/methods/notifications/#get
};

// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
//   - breakIf: fxn to call to check if we should fetch more pages, defaults to DEFAULT_BREAK_IF
//   - fetch: the data fetching function to call with params
//   - label: if it's a StorageKey use it for caching, if it's a string just use it for logging
//   - maxId: optional maxId to use for pagination
//   - maxRecords: optional max number of records to fetch
//   - moar: if true, continue fetching from the max_id found in the cache
//   - skipCache: if true, don't use cached data and don't lock the endpoint mutex when making requests
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    storageKey: StorageKey,  // Mutex will be skipped if label is a string not a StorageKey,
    batchSize?: number,
    maxId?: string | number,
    maxRecords?: number,
    moar?: boolean,
    skipCache?: boolean,
    skipMutex?: boolean,
    breakIf?: (pageOfResults: T[], allResults: T[]) => Promise<true | undefined>,
};


export default class MastoApi {
    static #instance: MastoApi;  // Singleton instance of MastoApi

    api: mastodon.rest.Client;
    homeDomain: string;
    user: Account;
    userData?: UserData;  // Save UserData in the API object to avoid polling local storage over and over

    private mutexes: ApiMutex;  // Mutexes for blocking concurrent requests
    private requestSemphore = new Semaphore(Config.maxConcurrentRequestsInitial); // Semaphore for limiting search & tag requests

    // URL for tag on the user's homeserver
    tagUrl = (tag: MastodonTag | string) => `${this.endpointURL(TAGS)}/${typeof tag === "string" ? tag : tag.name}`;
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
        this.mutexes = Object.keys(StorageKey).reduce((acc, key) => {
            acc[StorageKey[key as keyof typeof StorageKey]] = new Mutex();
            return acc;
        }, {} as ApiMutex);
    }

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags).
    // Pagination starts at the most recent toots and goes backwards in time.
    //    - mergeTootsToFeed: fxn to call to merge the fetched toots into the feed
    //    - numToots:         maximum number of toots to fetch
    //    - maxTootedAt:      optional date to use as the cutoff (stop fetch if we find older toots)
    //    - maxId:            optional maxId to start the fetch from (works backwards)
    // TODO: should there be a mutex? Only called by triggerFeedUpdate() which can only run once at a time
    async fetchHomeFeed(
        mergeTootsToFeed: (toots: Toot[], logPrefix: string) => Promise<void>,
        moreOldToots?: boolean,
        maxRecords?: number,
        maxId?: string | number,  // Optional maxId to use to start pagination
    ): Promise<Toot[]> {
        maxRecords ||= Config.numDesiredTimelineToots;
        const logPrefix = bracketed(StorageKey.HOME_TIMELINE);
        const startedAt = new Date();
        let allNewToots: Toot[] = [];
        let cutoffAt = timelineCutoffAt();
        let oldestTootStr = "no oldest toot";
        let homeTimelineToots = await Storage.getCoerced<Toot>(StorageKey.HOME_TIMELINE);

        if (moreOldToots) {
            maxId = findMinId(homeTimelineToots);
            console.log(`${logPrefix} Fetching more old toots (found min ID ${maxId})`);
        } else {
            // Look back additional lookbackForUpdatesMinutes minutes to catch new updates and edits to toots
            const maxTootedAt = mostRecentTootedAt(homeTimelineToots);
            cutoffAt = maxTootedAt ? subtractSeconds(maxTootedAt, LOOKBACK_SECONDS) : timelineCutoffAt();
            cutoffAt = mostRecent(timelineCutoffAt(), cutoffAt)!;
            console.debug(`${logPrefix} maxTootedAt: ${quotedISOFmt(maxTootedAt)}, maxId: ${maxId}, cutoffAt: ${quotedISOFmt(cutoffAt)}`);
        }

        // getApiRecords() returns Toots that haven't had completeProperties() called on them
        // which we don't use because breakIf() calls mergeTootsToFeed() on each page of results
        const _incompleteToots = await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.timelines.home.list,
            storageKey: StorageKey.HOME_TIMELINE,
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
                const newToots = await Toot.buildToots(newStatuses, StorageKey.HOME_TIMELINE);
                await mergeTootsToFeed(newToots, logPrefix);
                allNewToots = allNewToots.concat(newToots)

                // Break the toot fetching loop if we encounter a toot older than cutoffAt
                if (oldestTootAt < cutoffAt) {
                    console.log(`${logPrefix} Halting fetch (${oldestTootStr} <= cutoff ${quotedISOFmt(cutoffAt)})`);
                    return true;
                }
            }
        }) as Toot[];

        homeTimelineToots = Toot.dedupeToots([...allNewToots, ...homeTimelineToots], StorageKey.HOME_TIMELINE)
        let msg = `${logPrefix} Fetched ${allNewToots.length} new toots ${ageString(startedAt)} (${oldestTootStr}`;
        console.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        await Storage.set(StorageKey.HOME_TIMELINE, homeTimelineToots);
        return homeTimelineToots;
    }

    // Get blocked accounts (doesn't include muted accounts)
    async getBlockedAccounts(): Promise<Account[]> {
        return await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.blocks.list,
            storageKey: StorageKey.BLOCKED_ACCOUNTS
        }) as Account[];
    }

    // Generic data getter for things we want to cache but require custom fetch logic
    //    - maxRecordsConfigKey: optional config key to use to truncate the number of records returned
    async getCacheableToots(
        key: StorageKey,
        fetch: () => Promise<mastodon.v1.Status[]>,
        maxRecordsConfigKey: keyof ConfigType
    ): Promise<Toot[]> {
        const logPrefix = `[${key} getCacheableToots()]`;
        const releaseMutex = await lockExecution(this.mutexes[key], logPrefix);
        const startedAt = new Date();

        try {
            let toots = await Storage.getIfNotStale<Toot[]>(key);

            if (!toots) {
                const statuses = await fetch();
                console.debug(`${logPrefix} Retrieved ${statuses.length} Status objects ${ageString(startedAt)}`);
                toots = await Toot.buildToots(statuses, maxRecordsConfigKey.replace(/^num/, ""), logPrefix);
                console.log([`[SET_LOADING_STATUS] ${logPrefix} built ${toots.length} toots`])

                if (maxRecordsConfigKey) {
                    toots = truncateToConfiguredLength(toots, maxRecordsConfigKey);
                }

                await Storage.set(key, toots);
            }

            traceLog(`[SET_LOADING_STATUS] ${logPrefix} finished retrieving ${ageString(startedAt)}`);
            return toots;
        } finally {
            releaseMutex();
        }
    }

    // Get accounts the user is following
    async getFollowedAccounts(): Promise<Account[]> {
        const accounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            storageKey: StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: Config.maxFollowingAccountsToPull,
        }) as Account[];

        accounts.forEach(account => account.isFollowed = true);
        return accounts;
    }

    // Get hashtags the user is following
    async getFollowedTags(): Promise<mastodon.v1.Tag[]> {
        const followedTags = await this.getApiRecords<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            storageKey: StorageKey.FOLLOWED_TAGS,
        }) as mastodon.v1.Tag[];

        return followedTags.map(repairTag);
    }

    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts(): Promise<Account[]> {
        const mutedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.mutes.list,
            storageKey: StorageKey.MUTED_ACCOUNTS
        }) as Account[];

        const blockedAccounts = await this.getBlockedAccounts();
        return mutedAccounts.concat(blockedAccounts);
    }

    // Get an array of Toots the user has recently favourited
    // https://docs.joinmastodon.org/methods/favourites/#get
    // IDs of accounts ar enot monotonic so there's not really any way to
    // incrementally load this endpoint (the only way is pagination)
    async getRecentFavourites(moar?: boolean): Promise<Toot[]> {
        return await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.favourites.list,
            storageKey: StorageKey.FAVOURITED_TOOTS,
            // moar: moar,
        }) as Toot[];
    }

    // Get the user's recent notifications
    async getRecentNotifications(moar?: boolean): Promise<mastodon.v1.Notification[]> {
        return await this.getApiRecords<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            storageKey: StorageKey.RECENT_NOTIFICATIONS,
            moar: moar,
        }) as mastodon.v1.Notification[];
    }

    // Get the user's recent toots
    // NOTE: the user's own Toots don't have completeProperties() called on them!
    async getRecentUserToots(moar?: boolean): Promise<Toot[]> {
        return await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            storageKey: StorageKey.RECENT_USER_TOOTS,
            moar: moar,
        }) as Toot[];
    }

    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.getApiRecords() doesn't work here because endpoint doesn't paginate the same way
    async getServerSideFilters(): Promise<mastodon.v2.Filter[]> {
        const logPrefix = bracketed(StorageKey.SERVER_SIDE_FILTERS);
        const releaseMutex = await lockExecution(this.mutexes[StorageKey.SERVER_SIDE_FILTERS], logPrefix);
        const startTime = new Date();

        try {
            let filters = await Storage.getIfNotStale<mastodon.v2.Filter[]>(StorageKey.SERVER_SIDE_FILTERS);

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
                await Storage.set(StorageKey.SERVER_SIDE_FILTERS, filters);
            }

            return filters;
        } finally {
            releaseMutex();
        }
    };

    // Get latest toots for a given tag using both the Search API and tag timeline API.
    // The two APIs give results with surprising little overlap (~80% of toots are unique)
    async getStatusesForTag(tag: MastodonTag, numToots?: number): Promise<mastodon.v1.Status[]> {
        numToots ||= Config.numTootsPerTrendingTag;

        const tagToots = await Promise.all([
            this.searchForToots(tag.name, numToots),
            this.hashtagTimelineToots(tag, numToots),
        ]);

        logTrendingTagResults(`[getStatusesForTag(#${tag.name})]`, "both hashtag searches", tagToots.flat());
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
            this.userData = await UserData.getUserData();
        }

        return this.userData;
    }

    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot: Toot): Promise<Toot> {
        const tootURI = toot.realURI();
        const urlDomain = extractDomain(tootURI);
        const logPrefix = `[API resolveToot()]`;
        console.debug(`${logPrefix} called for`, toot);
        if (urlDomain == this.homeDomain) return toot;
        const lookupResult = await this.api.v2.search.list({q: tootURI, resolve: true});

        if (!lookupResult?.statuses?.length) {
            logAndThrowError(`${logPrefix} got bad result for "${tootURI}"`, lookupResult);
        }

        const resolvedStatus = lookupResult.statuses[0];
        console.debug(`${logPrefix} found resolvedStatus for "${tootURI}":`, resolvedStatus);
        return Toot.build(resolvedStatus as mastodon.v1.Status);
    }

    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr: string, maxRecords?: number): Promise<mastodon.v1.Status[]> {
        maxRecords = maxRecords || Config.defaultRecordsPerPage;
        let logPrefix = `[API searchForToots("${searchStr}")]`;
        const releaseSemaphore = await lockExecution(this.requestSemphore, logPrefix);
        const query: mastodon.rest.v1.SearchParams = {limit: maxRecords, q: searchStr, type: STATUSES};
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
    private async getApiRecords<T extends MastodonApiObject>(
        fetchParams: FetchParams<T>
    ): Promise<Account[] | Toot[] | MastodonApiObject[]> {
        let logPfx = bracketed(fetchParams.storageKey);
        traceLog(`${logPfx} fetchData() params:`, fetchParams);
        let { batchSize, breakIf, fetch, maxId, maxRecords, moar, skipCache, skipMutex, storageKey } = fetchParams;
        if (moar && (skipCache || maxId)) console.warn(`${logPfx} skipCache=true AND moar or maxId set`);

        maxRecords ??= Config.minRecordsForFeatureScoring;
        batchSize ??= BATCH_SIZES[storageKey] || Config.defaultRecordsPerPage;
        batchSize = Math.min(batchSize, maxRecords);
        breakIf ??= DEFAULT_BREAK_IF;

        // Skip mutex for requests that aren't trying to get at the same data
        const releaseMutex = skipMutex ? null : await lockExecution(this.mutexes[storageKey], logPfx);
        const startedAt = new Date();
        let pageNumber = 0;
        let rows: T[] = [];

        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedRows = await Storage.getIfNotStale<T[]>(storageKey);

                if (cachedRows) {
                    if (!moar) return cachedRows;  // Return cached data unless moar=true

                    // IF MOAR!!!! then we want to find the minimum ID in the cached data and do a fetch from that point
                    // TODO: a bit janky of an approach... we could maybe use the min/max_id param in normal request
                    rows = cachedRows;
                    maxRecords = maxRecords + rows.length;  // Add another unit of maxRecords to # of rows we have now
                    maxId = findMinId(rows as MastodonObjWithID[]);
                    console.log(`${logPfx} Found min ID ${maxId} in cache to use as maxId request param`);
                };
            }

            // buildParams will coerce maxRecords down to the max per page if it's larger
            for await (const page of fetch(this.buildParams(batchSize, logPfx, maxId))) {
                rows = rows.concat(page as T[]);
                pageNumber += 1;
                const shouldStop = await breakIf(page, rows);  // Must be called before we check the length of rows!
                const recordsSoFar = `${page.length} in page, ${rows.length} records so far ${ageString(startedAt)}`;

                if (rows.length >= maxRecords || shouldStop) {
                    console.debug(`${logPfx} Completing fetch at page ${pageNumber}, ${recordsSoFar}`);
                    break;
                } else {
                    traceLog(`${logPfx} Retrieved page ${pageNumber} (${recordsSoFar})`);
                }
            }
        } catch (e) {
            // If the access token was not revoked whatever rows we've retrieved will be returned
            MastoApi.throwIfAccessTokenRevoked(e, `${logPfx} Failed ${ageString(startedAt)}, have ${rows.length} rows`);
        } finally {
            releaseMutex?.();
        }

        const objs = this.buildFromApiObjects(storageKey, rows);
        if (!skipCache) await Storage.set(storageKey, objs);
        return objs;
    }

    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    private async hashtagTimelineToots(tag: MastodonTag, maxRecords?: number): Promise<Toot[]> {
        maxRecords = maxRecords || Config.defaultRecordsPerPage;
        let logPrefix = `[hashtagTimelineToots("#${tag.name}")] (semaphore)`;
        const releaseSemaphore = await lockExecution(this.requestSemphore, logPrefix);
        const startedAt = new Date();

        try {
            const toots = await this.getApiRecords<mastodon.v1.Status>({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                storageKey: StorageKey.HASHTAG_TOOTS,
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

    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    private buildParams(
        batchSize: number,
        logPfx: string,
        maxId?: number | string,
    ): mastodon.DefaultPaginationParams {
        let params: mastodon.DefaultPaginationParams = {limit: batchSize};
        if (maxId) params = {...params, maxId: `${maxId}`};
        if (logPfx) traceLog(`${logPfx} Fetching with params:`, params);
        return params as mastodon.DefaultPaginationParams;
    }

    // Construct an Account or Toot object from the API object (otherwise just return the object)
    private buildFromApiObjects(key: StorageKey, objects: MastodonApiObject[]):  Account[] | Toot[] | MastodonApiObject[] {
        if (STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            return objects.map(o => Account.build(o as mastodon.v1.Account));
        } else if (STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            return objects.map(o => Toot.build(o as mastodon.v1.Status));
        } else {
            return objects;
        }
    }

    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////

    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(e: unknown, msg: string): void {
        console.error(`${msg}. Error:`, e);

        if (isAccessTokenRevokedError(e)) {
            throw e;
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


// TODO: get rid of this eventually
const logTrendingTagResults = (logPrefix: string, searchMethod: string, toots: mastodon.v1.Status[] | Toot[]): void => {
    let msg = `${logPrefix} ${searchMethod} found ${toots.length} toots`;
    msg += ` (oldest=${quotedISOFmt(earliestTootedAt(toots))}, newest=${quotedISOFmt(mostRecentTootedAt(toots))}):`
    console.debug(msg);
};
