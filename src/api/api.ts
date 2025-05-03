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
import Storage from "../Storage";
import Toot, { earliestTootedAt, mostRecentTootedAt } from './objects/toot';
import UserData from "./user_data";
import { ApiMutex, MastodonObjWithID, MastodonTag, StorableObj, StorageKey } from "../types";
import { checkUniqueIDs, findMinId, isStorageKey, truncateToConfiguredLength } from "../helpers/collection_helpers";
import { Config } from "../config";
import { extractDomain } from '../helpers/string_helpers';
import { ageString, quotedISOFmt } from "../helpers/time_helpers";
import { lockMutex, logAndThrowError, traceLog } from '../helpers/log_helpers';
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
    label: StorageKey | string,  // Mutex will be skipped if label is a string not a StorageKey,
    maxId?: string | number,
    maxRecords?: number,
    skipCache?: boolean,
    breakIf?: (pageOfResults: T[], allResults: T[]) => boolean,
    moar?: boolean,
};


export default class MastoApi {
    static #instance: MastoApi;  // Singleton instance of MastoApi

    api: mastodon.rest.Client;
    homeDomain: string;
    user: Account;
    userData?: UserData;  // Save UserData in the API object to avoid polling local storage over and over

    private mutexes: ApiMutex;
    private requestSemphore: Semaphore;  // Semaphore to limit concurrent requests
    private timelineLookBackMS: number;  // How far back to look for toots in the home timeline

    // URL for a tag on the user's homeserver
    tagURL = (tag: MastodonTag) => `${this.endpointURL(TAGS)}/${tag.name}`;
    endpointURL = (endpoint: string) => `https://${this.homeDomain}/${endpoint}`;

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
        this.timelineLookBackMS = Storage.getConfig().maxTimelineHoursToFetch * 3600 * 1000;

        // Initialize mutexes for each StorageKey and a Semaphore for concurrent requests
        this.mutexes = {} as ApiMutex;
        for (const key in StorageKey) this.mutexes[StorageKey[key as keyof typeof StorageKey]] = new Mutex();
        this.requestSemphore = new Semaphore(Storage.getConfig().maxConcurrentTootRequests);
    };

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags)
    async fetchHomeFeed(numToots?: number, maxId?: string | number): Promise<Toot[]> {
        const logPrefix = `[API ${StorageKey.HOME_TIMELINE}]`;
        const cutoffAt = new Date(Date.now() - this.timelineLookBackMS);
        numToots ||= Storage.getConfig().numTootsInFirstFetch;

        const statuses = await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.timelines.home.list,
            label: StorageKey.HOME_TIMELINE,
            maxId: maxId,
            maxRecords: numToots,
            skipCache: true,  // always skip the cache for the home timeline
            breakIf: (_newPageOfResults, allResults) => {
                const oldestTootAt = earliestTootedAt(allResults) || new Date();

                // Break the toot fetching loop if we encounter a toot older than the cutoff date
                if (oldestTootAt && oldestTootAt <= cutoffAt) {
                    console.log(`${logPrefix} Halting (${quotedISOFmt(oldestTootAt)} <= ${quotedISOFmt(cutoffAt)})`);
                    return true;
                }

                return false;
            }
        });

        const toots = await Toot.buildToots(statuses, logPrefix);
        console.log(`${logPrefix} Retrieved ${toots.length} toots (oldest: ${quotedISOFmt(earliestTootedAt(toots))})`);
        return toots;
    };

    async getBlockedAccounts(): Promise<Account[]> {
        const blockedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.blocks.list,
            label: StorageKey.BLOCKED_ACCOUNTS
        });

        return blockedAccounts.map(a => new Account(a));
    };

    // Get accounts the user is following
    async getFollowedAccounts(): Promise<Account[]> {
        const followedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: Storage.getConfig().maxFollowingAccountsToPull,
        });

        return followedAccounts.map(a => new Account(a));
    }

    // Get hashtags the user is following
    async getFollowedTags(): Promise<mastodon.v1.Tag[]> {
        const followedTags = await this.getApiRecords<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            label: StorageKey.FOLLOWED_TAGS
        });

        return followedTags.map(repairTag);
    }

    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts(): Promise<Account[]> {
        const mutedAccounts = await this.getApiRecords<mastodon.v1.Account>({
            fetch: this.api.v1.mutes.list,
            label: StorageKey.MUTED_ACCOUNTS
        });

        const blockedAccounts = await this.getBlockedAccounts();
        return mutedAccounts.map(a => new Account(a)).concat(blockedAccounts);
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

        checkUniqueIDs(recentFaves, StorageKey.FAVOURITED_TOOTS);
        return recentFaves.map(t => new Toot(t));
    }

    // Get the user's recent notifications
    async getRecentNotifications(moar?: boolean): Promise<mastodon.v1.Notification[]> {
        const notifications = await this.getApiRecords<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            label: StorageKey.RECENT_NOTIFICATIONS,
            moar: moar,
        });

        checkUniqueIDs(notifications, StorageKey.RECENT_NOTIFICATIONS);
        return notifications;
    }

    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.getApiRecords() doesn't work here because endpoint doesn't paginate the same way
    async getServerSideFilters(): Promise<mastodon.v2.Filter[]> {
        const logPrefix = `[API ${StorageKey.SERVER_SIDE_FILTERS}]`;
        const releaseMutex = await lockMutex(this.mutexes[StorageKey.SERVER_SIDE_FILTERS], logPrefix);
        const startTime = new Date();

        try {
            let filters = await Storage.get(StorageKey.SERVER_SIDE_FILTERS) as mastodon.v2.Filter[];

            if (filters && !(await Storage.isDataStale(StorageKey.SERVER_SIDE_FILTERS))) {
                console.debug(`${logPrefix} Loaded ${filters.length} recoreds from cache:`);
            } else {
                filters = await this.api.v2.filters.list();

                // Filter out filters that either are just warnings or don't apply to the home context
                filters = filters.filter(filter => {
                    // Before Mastodon 4.0 Filter objects lacked a 'context' property altogether
                    if (filter.context?.length > 0 && !filter.context.includes("home")) return false;
                    if (filter.filterAction != "hide") return false;
                    return true;
                });

                await Storage.set(StorageKey.SERVER_SIDE_FILTERS, filters);
                console.log(`${logPrefix} Retrieved ${filters.length} records ${ageString(startTime)}:`, filters);
            }

            return filters;
        } finally {
            releaseMutex();
        }
    };

    // Get latest toots for a given tag using both the Search API and tag timeline API.
    // The two APIs give results with surprising little overlap (~80% of toots are unique)
    async getStatusesForTag(tag: MastodonTag, numToots?: number): Promise<mastodon.v1.Status[]> {
        numToots ||= Storage.getConfig().numTootsPerTrendingTag;

        const tagToots = await Promise.all([
            this.searchForToots(tag.name, numToots),
            this.hashtagTimelineToots(tag, numToots),
        ]);

        return tagToots.flat();
    }

    // Collect and fully populate / dedup a collection of toots for an array of Tags
    async getStatusesForTags(tags: MastodonTag[]): Promise<mastodon.v1.Status[]> {
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

    // Get the user's recent toots
    // NOTE: the user's own Toots don't have setDependentProperties() called on them!
    async getUserRecentToots(moar?: boolean): Promise<Toot[]> {
        const recentToots = await this.getApiRecords<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: StorageKey.RECENT_USER_TOOTS,
            moar: moar,
        });

        checkUniqueIDs(recentToots, StorageKey.RECENT_USER_TOOTS);
        return recentToots.map(t => new Toot(t));
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
        return new Toot(resolvedStatus as mastodon.v1.Status);
    };

    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    //   - logMsg:        optional description of why the search is being run (for logging only)
    async searchForToots(searchStr: string, maxRecords?: number): Promise<mastodon.v1.Status[]> {
        maxRecords = maxRecords || Storage.getConfig().defaultRecordsPerPage;
        const query: mastodon.rest.v1.SearchParams = {limit: maxRecords, q: searchStr, type: STATUSES};
        const startTime = new Date();
        const [semaphoreNum, releaseSemaphore] = await this.requestSemphore.acquire();
        const logPrefix = `[searchForToots("${searchStr}")] (semaphore ${semaphoreNum})`;

        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            console.debug(`${logPrefix} Retrieved ${statuses.length} ${ageString(startTime)}`);
            return statuses;
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${ageString(startTime)}`);
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
        maxRecordsConfigKey?: keyof Config
    ): Promise<Toot[]> {
        const logPrefix = `[API getCacheableToots ${key}]`;
        const releaseMutex = await lockMutex(this.mutexes[key], logPrefix);
        const startedAt = new Date();

        try {
            let toots = await Storage.getToots(key);

            if (!toots || (await Storage.isDataStale(key))) {
                const statuses = await fetch();
                console.debug(`${logPrefix} Retrieved ${statuses.length} Status objects ${ageString(startedAt)}`);
                toots = await Toot.buildToots(statuses, logPrefix);

                if (maxRecordsConfigKey) {
                    toots = truncateToConfiguredLength(toots, maxRecordsConfigKey);
                }

                await Storage.storeToots(key, toots);
            } else {
                traceLog(`${logPrefix} Loaded ${toots.length} cached toots ${ageString(startedAt)}`);
            }

            return toots;
        } finally {
            releaseMutex();
        }
    }

    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    private async getApiRecords<T>(fetchParams: FetchParams<T>): Promise<T[]> {
        const logPfx = `[API ${fetchParams.label}]`;
        const useCache = isStorageKey(fetchParams.label);
        fetchParams.breakIf ??= DEFAULT_BREAK_IF;
        fetchParams.maxRecords ??= Storage.getConfig().minRecordsForFeatureScoring;
        fetchParams.skipCache ||= !useCache;  // Skip cache if label is not a StorageKey
        let { breakIf, fetch, label, maxId, maxRecords, moar, skipCache } = fetchParams;
        if (moar && (skipCache || maxId)) console.warn(`${logPfx} skipCache=true AND moar or maxId set`);
        traceLog(`${logPfx} fetchData() params:`, fetchParams);

        // Skip mutex if label is not a StorageKey (and so not in the mutexes dictionary)
        const releaseMutex = useCache ? await lockMutex(this.mutexes[label as StorageKey], logPfx) : null;
        const startedAt = new Date();
        let pageNumber = 0;
        let rows: T[] = [];

        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedRows = await Storage.get(label as StorageKey) as T[];

                if (cachedRows && !(await Storage.isDataStale(label as StorageKey))) {
                    rows = cachedRows;
                    traceLog(`${logPfx} Loaded ${rows.length} cached rows ${ageString(startedAt)}`);
                    if (!moar) return rows;

                    // IF MOAR!!!! then we want to find the minimum ID in the cached data and do a fetch from that point
                    // TODO: a bit janky of an approach... we could maybe use the min/max_id param in normal request
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

            if (!skipCache) await Storage.set(label as StorageKey, rows as StorableObj);
        } catch (e) {
            // If the access token was not revoked whatever rows we've retrieved will be returned
            this.throwIfAccessTokenRevoked(e, `${logPfx} Failed ${ageString(startedAt)}, have ${rows.length} rows`);
        } finally {
            releaseMutex?.();
        }

        return rows;
    }

    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    private async hashtagTimelineToots(tag: MastodonTag, maxRecords?: number): Promise<mastodon.v1.Status[]> {
        maxRecords = maxRecords || Storage.getConfig().defaultRecordsPerPage;
        const startedAt = new Date();
        const [semaphoreNum, releaseSemaphore] = await this.requestSemphore.acquire();
        const logPrefix = `[getTootsForHashtag("#${tag.name}")] (semaphore ${semaphoreNum})`;

        try {
            const toots = await this.getApiRecords<mastodon.v1.Status>({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                label: logPrefix,  // String label means skip mutex and skipCache=true
                maxRecords: maxRecords,
            });

            console.debug(`${logPrefix} Retrieved ${toots.length} toots ${ageString(startedAt)}`);
            return toots;
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${ageString(startedAt)}`);
            return [];
        } finally {
            releaseSemaphore();
        }
    };

    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    private buildParams(maxId?: number | string, limit?: number, logPfx?: string): mastodon.DefaultPaginationParams {
        limit ||= Storage.getConfig().defaultRecordsPerPage;

        let params: mastodon.DefaultPaginationParams = {
            limit: Math.min(limit, Storage.getConfig().defaultRecordsPerPage),
        };

        if (maxId) params = {...params, maxId: `${maxId}`};
        if (logPfx) traceLog(`${logPfx} Fetching with params:`, params);
        return params as mastodon.DefaultPaginationParams;
    };

    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    private throwIfAccessTokenRevoked(e: unknown, msg: string): void {
        console.error(`${msg}. Error:`, e);
        if (!(e instanceof Error)) return;

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
