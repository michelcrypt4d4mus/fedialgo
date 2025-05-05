/*
 * Singleton class to wrap authenticated mastodon API calls to the user's home server
 * (unauthenticated calls are handled by the MastodonServer class).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
import { capitalCase } from "change-case";
import { mastodon } from "masto";
import { Mutex, Semaphore } from 'async-mutex';

import Account from "./objects/account";
import Storage, { STORAGE_KEYS_WITH_ACCOUNTS, STORAGE_KEYS_WITH_TOOTS} from "../Storage";
import Toot, { earliestTootedAt, mostRecentTootedAt } from './objects/toot';
import UserData from "./user_data";
import { ApiMutex, MastodonObjWithID, MastodonTag, StorableApiObject, StorableObj, StorageKey } from "../types";
import { checkUniqueIDs, findMinId, isStorageKey, truncateToConfiguredLength } from "../helpers/collection_helpers";
import { Config, ConfigType } from "../config";
import { extractDomain } from '../helpers/string_helpers';
import { ageInSeconds, ageString, quotedISOFmt, timelineCutoffAt } from "../helpers/time_helpers";
import { lockMutex, lockSemaphore, logAndThrowError, traceLog } from '../helpers/log_helpers';
import { repairTag } from "./objects/tag";

export const INSTANCE = "instance";
export const LINKS = "links";
export const STATUSES = "statuses";
export const TAGS = "tags";

const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const DEFAULT_BREAK_IF = (pageOfResults: any[], allResults: any[]) => false;


// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
//   - breakIf: fxn to call to check if we should fetch more pages, defaults to DEFAULT_BREAK_IF()
//   - fetch: the data fetching function to call with params
//   - label: if it's a StorageKey use it for caching, if it's a string just use it for logging
//   - maxId: optional maxId to use for pagination
//   - maxRecords: optional max number of records to fetch
//   - moar: if true, continue fetching from the max_id found in the cache
//   - skipCache: if true, don't use cached data and don't lock the endpoint mutex when making requests
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    label: StorageKey,  // Mutex will be skipped if label is a string not a StorageKey,
    maxId?: string | number,
    maxRecords?: number,
    skipCache?: boolean,
    skipMutex?: boolean,
    breakIf?: (pageOfResults: T[], allResults: T[]) => boolean,
    moar?: boolean,
};


export default class MastoApi {
    static #instance: MastoApi;  // Singleton instance of MastoApi

    api: mastodon.rest.Client;
    homeDomain: string;
    user: Account;
    userData?: UserData;  // Save UserData in the API object to avoid polling local storage over and over
    tagURL = (tag: MastodonTag) => `${this.endpointURL(TAGS)}/${tag.name}`;  // URL for tag on the user's homeserver
    endpointURL = (endpoint: string) => `https://${this.homeDomain}/${endpoint}`;

    private mutexes: ApiMutex;
    private requestSemphore: Semaphore;  // Semaphore to limit concurrent requests

    static init(api: mastodon.rest.Client, user: Account): void {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }

        console.log(`[API] Initializing MastoApi instance with user:`, user.acct);
        MastoApi.#instance = new MastoApi(api, user);
    };

    public static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    };

    private constructor(api: mastodon.rest.Client, user: Account) {
        this.api = api;
        this.user = user;
        this.homeDomain = extractDomain(user.url);

        // Initialize mutexes for each StorageKey and a Semaphore for concurrent requests
        this.mutexes = {} as ApiMutex;
        for (const key in StorageKey) this.mutexes[StorageKey[key as keyof typeof StorageKey]] = new Mutex();
        this.requestSemphore = new Semaphore(Config.maxConcurrentRequestsInitial);
    };

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags)
    async fetchHomeFeed(numToots?: number, maxId?: string | number): Promise<Toot[]> {
        const logPrefix = `[API ${StorageKey.HOME_TIMELINE}]`;
        const cutoffAt = timelineCutoffAt();
        const startedAt = new Date();

        const statuses = await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.timelines.home.list,
            label: StorageKey.HOME_TIMELINE,
            maxId: maxId,
            maxRecords: numToots || Config.homeTimelineBatchSize,
            skipCache: true,  // always skip the cache for the home timeline
            breakIf: (_newPageOfResults, allResults) => {
                const oldestTootAt = earliestTootedAt(allResults) || new Date();

                // Break the toot fetching loop if we encounter a toot older than the cutoff date
                if (oldestTootAt && (oldestTootAt <= cutoffAt)) {
                    console.log(`${logPrefix} Halting (${quotedISOFmt(oldestTootAt)} <= ${quotedISOFmt(cutoffAt)})`);
                    return true;
                }

                return false;
            }
        }) as Toot[];

        // In one experiment it took 2.1 seconds to get 80 toos from the API and another 8 seconds to call setDependentProperties(toot)
        traceLog(`${logPrefix} Fetched ${statuses.length} statuses ${ageString(startedAt)}`);
        const toots = await Toot.buildToots(statuses, StorageKey.HOME_TIMELINE, logPrefix);
        traceLog(`${logPrefix} Built ${toots.length} toots ${ageString(startedAt)} (oldest: ${quotedISOFmt(earliestTootedAt(toots))})`);
        return toots;
    };

    async getBlockedAccounts(): Promise<Account[]> {
        const blockedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.blocks.list,
            label: StorageKey.BLOCKED_ACCOUNTS
        });

        return blockedAccounts as Account[];
    };

    // Get accounts the user is following
    async getFollowedAccounts(): Promise<Account[]> {
        const followedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: Config.maxFollowingAccountsToPull,
        });

        return followedAccounts as Account[];
    }

    // Get hashtags the user is following
    async getFollowedTags(): Promise<mastodon.v1.Tag[]> {
        const followedTags = await this.getApiRecords<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            label: StorageKey.FOLLOWED_TAGS
        });

        const tags = followedTags as mastodon.v1.Tag[];
        return tags.map(repairTag);
    }

    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts(): Promise<Account[]> {
        const mutedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.mutes.list,
            label: StorageKey.MUTED_ACCOUNTS
        }) as Account[];

        const blockedAccounts = await this.getBlockedAccounts();
        return mutedAccounts.concat(blockedAccounts);
    }

    // Get an array of Toots the user has recently favourited
    // https://docs.joinmastodon.org/methods/favourites/#get
    // IDs of accounts ar enot monotonic so there's not really any way to
    // incrementally load this endpoint (the only way is pagination)
    async getRecentFavourites(moar?: boolean): Promise<Toot[]> {
        const recentFaves = await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.favourites.list,
            label: StorageKey.FAVOURITED_TOOTS,
            // moar: moar,
        });

        return recentFaves as Toot[];
    }

    // Get the user's recent notifications
    async getRecentNotifications(moar?: boolean): Promise<mastodon.v1.Notification[]> {
        const notifications = await this.getApiRecords<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            label: StorageKey.RECENT_NOTIFICATIONS,
            moar: moar,
        });

        return notifications as mastodon.v1.Notification[];
    }

    // Get the user's recent toots
    // NOTE: the user's own Toots don't have setDependentProperties() called on them!
    async getRecentUserToots(moar?: boolean): Promise<Toot[]> {
        const recentToots = await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: StorageKey.RECENT_USER_TOOTS,
            moar: moar,
        });

        return recentToots as Toot[];
    };

    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.getApiRecords() doesn't work here because endpoint doesn't paginate the same way
    async getServerSideFilters(): Promise<mastodon.v2.Filter[]> {
        const logPrefix = `[API ${StorageKey.SERVER_SIDE_FILTERS}]`;
        const releaseMutex = await lockMutex(this.mutexes[StorageKey.SERVER_SIDE_FILTERS], logPrefix);
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

        return tagToots.flat();
    }

    // Collect and fully populate / dedup a collection of toots for an array of Tags
    async getStatusesForTags(tags: MastodonTag[]): Promise<mastodon.v1.Status[]> {
        console.log(`[getStatusesForTags()] called for ${tags.length} tags:`, tags.map(t => t.name));
        const tagToots = await Promise.all(tags.map(tag => this.getStatusesForTag(tag)));
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
    };

    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot: Toot): Promise<Toot> {
        const tootURI = toot.realURI();
        const urlDomain = extractDomain(tootURI);
        const logPrefix = `[resolveToot()]`;
        console.debug(`${logPrefix} called for`, toot);
        if (urlDomain == this.homeDomain) return toot;
        const lookupResult = await this.api.v2.search.list({q: tootURI, resolve: true});

        if (!lookupResult?.statuses?.length) {
            logAndThrowError(`${logPrefix} got bad result for '${tootURI}'`, lookupResult);
        }

        const resolvedStatus = lookupResult.statuses[0];
        console.debug(`${logPrefix} found resolvedStatus for '${tootURI}:`, resolvedStatus);
        return Toot.build(resolvedStatus as mastodon.v1.Status);
    };

    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr: string, maxRecords?: number): Promise<mastodon.v1.Status[]> {
        maxRecords = maxRecords || Config.defaultRecordsPerPage;
        let logPrefix = `[API searchForToots("${searchStr}")]`;
        const [semaphoreNum, releaseSemaphore] = await lockSemaphore(this.requestSemphore, logPrefix);
        const query: mastodon.rest.v1.SearchParams = {limit: maxRecords, q: searchStr, type: STATUSES};
        logPrefix += ` (semaphore ${semaphoreNum})`;
        const startedAt = new Date();

        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            console.debug(`${logPrefix} Retrieved ${statuses.length} ${ageString(startedAt)}`);
            return statuses;
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${ageString(startedAt)}`);
            return [];
        } finally {
            releaseSemaphore();
        }
    };

    // Generic data getter for things we want to cache but require custom fetch logic
    //    - maxRecordsConfigKey: optional config key to use to truncate the number of records returned
    async getCacheableToots(
        key: StorageKey,
        fetch: () => Promise<mastodon.v1.Status[]>,
        maxRecordsConfigKey: keyof ConfigType
    ): Promise<Toot[]> {
        const logPrefix = `[API getCacheableToots ${key}]`;
        const releaseMutex = await lockMutex(this.mutexes[key], logPrefix);
        const startedAt = new Date();

        try {
            let toots = await Storage.getIfNotStale<Toot[]>(key);

            if (!toots) {
                const statuses = await fetch();
                console.debug(`${logPrefix} Retrieved ${statuses.length} Status objects ${ageString(startedAt)}`);
                toots = await Toot.buildToots(statuses, maxRecordsConfigKey.replace(/^num/, ""), logPrefix);

                if (maxRecordsConfigKey) {
                    toots = truncateToConfiguredLength(toots, maxRecordsConfigKey);
                }

                await Storage.set(key, toots);
            }

            return toots;
        } finally {
            releaseMutex();
        }
    }

    // After the initial load we don't need to have massive concurrency and in fact it can be a big resource
    // drain switching back to the browser window, which triggers a lot of background requests
    // TODO: should this call this.requestSemphore.setValue() instead? https://www.npmjs.com/package/async-mutex
    setSemaphoreConcurrency(concurrency: number): void {
        console.log(`[MastoApi] Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new Semaphore(concurrency);
    }

    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    private async getApiRecords<T extends StorableApiObject>(
        fetchParams: FetchParams<T>
    ): Promise<T[] | Toot[] | Account[]> {
        let logPfx = `[API ${fetchParams.label}]`;
        fetchParams.breakIf ??= DEFAULT_BREAK_IF;
        fetchParams.maxRecords ??= Config.minRecordsForFeatureScoring;
        let { breakIf, fetch, label, maxId, maxRecords, moar, skipCache, skipMutex } = fetchParams;
        if (moar && (skipCache || maxId)) console.warn(`${logPfx} skipCache=true AND moar or maxId set`);
        traceLog(`${logPfx} fetchData() params:`, fetchParams);

        // Skip mutex if label is not a StorageKey (and so not in the mutexes dictionary)
        // This is for data pulls that are not trying to get at the same data (e.g. running a bunch of searches
        // for different terms vs. trying to get the user's home timeline, which does require a mutex)
        const releaseMutex = skipMutex ? await lockMutex(this.mutexes[label], logPfx) : null;
        // Trying to put a global semaphore on requests led to thread locks - apparently the searchForToots()
        // requests are grabbing all the semaphores and something important can't get through.
        // const [semaphoreNum, releaseSemaphore] = await lockSemaphore(this.requestSemphore, logPfx);
        // logPfx += ` (semaphore ${semaphoreNum})`;
        const startedAt = new Date();
        let pageNumber = 0;
        let rows: T[] = [];

        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedRows = await Storage.getIfNotStale<T[]>(label);

                if (cachedRows) {
                    // Return cached data unless moar=true
                    if (!moar) return cachedRows;

                    // IF MOAR!!!! then we want to find the minimum ID in the cached data and do a fetch from that point
                    // TODO: a bit janky of an approach... we could maybe use the min/max_id param in normal request
                    rows = cachedRows;
                    maxRecords = maxRecords + rows.length;  // Add another unit of maxRecords to # of rows we have now
                    maxId = findMinId(rows as MastodonObjWithID[]);
                    console.log(`${logPfx} Found min ID ${maxId} in cache to use as maxId request param`);
                };
            }

            for await (const page of fetch(this.buildParams(maxId, maxRecords, logPfx))) {
                rows = rows.concat(page as T[]);
                pageNumber += 1;
                const recordsSoFar = `have ${rows.length} records so far ${ageString(startedAt)}`;

                if (rows.length >= maxRecords || breakIf(page, rows)) {
                    traceLog(`${logPfx} Completing fetch at page ${pageNumber} ${recordsSoFar}`);
                    break;
                } else {
                    traceLog(`${logPfx} Retrieved page ${pageNumber} (${recordsSoFar})`);
                }
            }

            if (!skipCache) await Storage.set(label, rows as StorableObj);
        } catch (e) {
            // If the access token was not revoked whatever rows we've retrieved will be returned
            MastoApi.throwIfAccessTokenRevoked(e, `${logPfx} Failed ${ageString(startedAt)}, have ${rows.length} rows`);
        } finally {
            releaseMutex?.();
            // releaseSemaphore();
        }

        return Storage.buildFromApiObjects(label, rows) as T[];
    }

    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    private async hashtagTimelineToots(tag: MastodonTag, maxRecords?: number): Promise<Toot[]> {
        maxRecords = maxRecords || Config.defaultRecordsPerPage;
        let logPrefix = `[hashtagTimelineToots("#${tag.name}")]`;
        const [semaphoreNum, releaseSemaphore] = await lockSemaphore(this.requestSemphore, logPrefix);
        logPrefix += ` (semaphore ${semaphoreNum})`;
        const startedAt = new Date();

        try {
            const toots = await this.getApiRecords<mastodon.v1.Status>({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                label: StorageKey.HASHTAG_TOOTS,  // String label means skip mutex and skipCache=true
                maxRecords: maxRecords,
                skipCache: true,
                skipMutex: true,
            });

            console.debug(`${logPrefix} Retrieved ${toots.length} toots ${ageString(startedAt)}`);
            return toots as Toot[];
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${ageString(startedAt)}`);
            return [];
        } finally {
            releaseSemaphore();
        }
    };

    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    private buildParams(maxId?: number | string, limit?: number, logPfx?: string): mastodon.DefaultPaginationParams {
        limit ||= Config.defaultRecordsPerPage;

        let params: mastodon.DefaultPaginationParams = {
            limit: Math.min(limit, Config.defaultRecordsPerPage),
        };

        if (maxId) params = {...params, maxId: `${maxId}`};
        if (logPfx) traceLog(`${logPfx} Fetching with params:`, params);
        return params as mastodon.DefaultPaginationParams;
    };

    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(e: unknown, msg: string): void {
        console.error(`${msg}. Error:`, e);

        if (!(e instanceof Error)) {
            console.warn(`${msg} - Error is not an instance of Error:`, e);
            return;
        }

        if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
            throw e;
        }
    }
};


// TODO: get rid of this eventually
const logTrendingTagResults = (logPrefix: string, searchMethod: string, toots: Toot[]): void => {
    let msg = `${logPrefix} ${capitalCase(searchMethod)} found ${toots.length} toots`;
    msg += ` (oldest=${quotedISOFmt(earliestTootedAt(toots))}, newest=${quotedISOFmt(mostRecentTootedAt(toots))}):`
    console.info(msg);
};
