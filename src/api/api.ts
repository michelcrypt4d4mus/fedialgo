/*
 * Helper methods for using mastodon API methods that require authentication on the user's
 * home server.
 */
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from "./objects/account";
import MastodonServer from "./mastodon_server";
import Storage from "../Storage";
import Toot, { earliestTootedAt } from './objects/toot';
import { countValues } from "../helpers/collection_helpers";
import { extractDomain } from '../helpers/string_helpers';
import { MastodonServersInfo, StorableObj, StorageKey, UserData, WeightName} from "../types";
import { repairTag } from "./objects/tag";
import { toISOFormat } from "../helpers/time_helpers";

export const INSTANCE = "instance";
export const LINKS = "links";
export const STATUSES = "statuses";
export const TAGS = "tags";

const API_URI = "api"
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const DEFAULT_BREAK_IF = (pageOfResults: any[], allResults: any[]) => false;

export type ApiMutex = Record<StorageKey | WeightName, Mutex>;


// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
//   - breakIf: fxn to call to check if we should fetch more pages, defaults to DEFAULT_BREAK_IF()
//   - fetch: the data fetching function to call with params
//   - label: key to use for caching
//   - maxId: optional maxId to use for pagination
//   - maxRecords: optional max number of records to fetch
//   - skipCache: if true, don't use cached data
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    label: StorageKey,
    maxId?: string | number,
    maxRecords?: number,
    skipCache?: boolean,
    breakIf?: (pageOfResults: T[], allResults: T[]) => boolean,
};


// Singleton class for interacting with the Mastodon API
export class MastoApi {
    api: mastodon.rest.Client;
    user: Account;
    homeDomain: string;
    mutexes: ApiMutex;
    userData?: UserData;  // Preserve user data for the session in the object to avoid having to go to local storage over and over
    static #instance: MastoApi;

    static init(api: mastodon.rest.Client, user: Account): void {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }

        console.log(`[MastoApi] Initializing MastoApi instance with user:`, user.acct);
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

        // Initialize mutexes for each key in Key and WeightName
        this.mutexes = {} as ApiMutex;
        for (const key in StorageKey) this.mutexes[StorageKey[key as keyof typeof StorageKey]] = new Mutex();
        for (const key in WeightName) this.mutexes[WeightName[key as keyof typeof WeightName]] = new Mutex();
    };

    // Retrieve background data about the user that will be used for scoring etc.
    async getUserData(): Promise<UserData> {
        // Use BLOCKED_ACCOUNTS as a stand in for all user data freshness
        const isDataStale = await Storage.isDataStale(StorageKey.BLOCKED_ACCOUNTS);
        if (this.userData && !isDataStale) return this.userData;
        console.debug(`[MastoApi] getUserData() getting blocked users and server side filters...`);

        const responses = await Promise.all([
            this.getFollowedAccounts(),
            this.getFollowedTags(),
            this.getMutedAccounts(),
            this.getServerSideFilters(),
        ]);

        // Cache a copy here instead of relying on browser storage because this is accessed quite a lot
        this.userData = {
            followedAccounts: Account.buildAccountNames(responses[0]),
            followedTags: countValues<mastodon.v1.Tag>(responses[1], tag => tag.name),
            mutedAccounts: Account.buildAccountNames(responses[2]),
            serverSideFilters: responses[3],
        };

        return this.userData;
    };

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags)
    async fetchHomeFeed(numToots?: number, maxId?: string | number): Promise<Toot[]> {
        numToots ||= Storage.getConfig().numTootsInFirstFetch;
        const timelineLookBackMS = Storage.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
        const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);

        const statuses = await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.timelines.home.list,
            label: StorageKey.HOME_TIMELINE,  // TODO: this shouldn't actually cache anything
            maxId: maxId,
            maxRecords: numToots || Storage.getConfig().maxTimelineTootsToFetch,
            skipCache: true,  // always skip the cache for the home timeline
            breakIf: (pageOfResults, allResults) => {
                const oldestTootAt = earliestTootedAt(allResults) || new Date();
                const oldestTootAtStr = toISOFormat(oldestTootAt);
                console.debug(`oldest in page: ${toISOFormat(earliestTootedAt(pageOfResults))}, oldest: ${oldestTootAtStr})`);

                if (oldestTootAt && oldestTootAt < cutoffTimelineAt) {
                    console.log(`Halting fetchHomeFeed() because oldestTootAt '${oldestTootAtStr}' is too old`);
                    return true;
                }

                return false;
            }
        });

        const toots = await Toot.buildToots(statuses);
        console.debug(`fetchHomeFeed() found ${toots.length} toots (oldest: '${toISOFormat(earliestTootedAt(toots))}'):`, toots);
        return toots;
    };

    // the search API can be used to search for toots, profiles, or hashtags. this is for toots.
    async searchForToots(searchQuery: string, limit?: number, logMsg?: string): Promise<Toot[]> {
        limit = limit || Storage.getConfig().defaultRecordsPerPage;
        logMsg = logMsg ? ` ${logMsg}` : "";
        console.debug(`[searchForToots] getting${logMsg} toots for query '${searchQuery}'`);
        const mastoQuery: mastodon.rest.v1.SearchParams = {limit: limit, q: searchQuery, type: STATUSES};

        try {
            const searchResult = await this.api.v2.search.fetch(mastoQuery);
            const toots = await Toot.buildToots(searchResult.statuses);
            console.debug(`[searchForToots] Found ${toots.length}${logMsg} toots for query`, mastoQuery);
            return toots;
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `Failed to get${logMsg} toots for query '${searchQuery}'`);
            return [];
        }
    };

    // Get the user's recent toots
    async getUserRecentToots(): Promise<Toot[]> {
        const recentToots = await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: StorageKey.RECENT_USER_TOOTS
        });

        return recentToots.map(t => new Toot(t));
    };

    // Get accounts the user is following
    async getFollowedAccounts(): Promise<Account[]> {
        const followedAccounts = await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: Storage.getConfig().maxFollowingAccountsToPull,
        });

        return followedAccounts.map(a => new Account(a));
    };

    // Get hashtags the user is following
    async getFollowedTags(): Promise<mastodon.v1.Tag[]> {
        const followedTags = await this.fetchData<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            label: StorageKey.FOLLOWED_TAGS
        });

        return (followedTags || []).map(repairTag);
    }

    // Get the user's recent notifications
    async getRecentNotifications(): Promise<mastodon.v1.Notification[]> {
        return await this.fetchData<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            label: StorageKey.RECENT_NOTIFICATIONS
        });
    }

    // Get an array of Toots the user has recently favourited
    async fetchRecentFavourites(): Promise<Toot[]> {
        const recentFaves = await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.favourites.list,
            label: StorageKey.FAVOURITED_ACCOUNTS
        });

        return recentFaves.map(t => new Toot(t));
    };

    async fetchBlockedAccounts(): Promise<Account[]> {
        const blockedAccounts = await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.blocks.list,
            label: StorageKey.BLOCKED_ACCOUNTS
        });

        return blockedAccounts.map(a => new Account(a));
    };

    async getMutedAccounts(): Promise<Account[]> {
        const mutedAccounts = await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.mutes.list,
            label: StorageKey.MUTED_ACCOUNTS
        });

        const blockedAccounts = await this.fetchBlockedAccounts();
        return mutedAccounts.map(a => new Account(a)).concat(blockedAccounts);
    };

    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.fetchData() doesn't work here because it's a v2 endpoint
    async getServerSideFilters(): Promise<mastodon.v2.Filter[]> {
        console.debug(`getServerSideFilters() called...`);
        const releaseMutex = await this.mutexes[StorageKey.SERVER_SIDE_FILTERS].acquire()

        try {
            let filters = await Storage.get(StorageKey.SERVER_SIDE_FILTERS) as mastodon.v2.Filter[];

            if (!filters || (await Storage.isDataStale(StorageKey.SERVER_SIDE_FILTERS))) {
                filters = await this.api.v2.filters.list();

                // Filter out filters that either are just warnings or don't apply to the home context
                filters = filters.filter(filter => {
                    // Before Mastodon 4.0 Filter objects lacked a 'context' property altogether
                    if (filter.context?.length > 0 && !filter.context.includes("home")) return false;
                    if (filter.filterAction != "hide") return false;
                    return true;
                });

                await Storage.set(StorageKey.SERVER_SIDE_FILTERS, filters);
                console.log(`Retrieved remote ${StorageKey.SERVER_SIDE_FILTERS}:`, filters);
            } else {
                console.debug(`Loaded ${StorageKey.SERVER_SIDE_FILTERS} from cache:`, filters);
            }

            return filters;
        } finally {
            releaseMutex();
        }
    };

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    // TODO: move this to mastodon_server.ts
    async getMastodonServersInfo(): Promise<MastodonServersInfo> {
        const releaseMutex = await this.mutexes[StorageKey.POPULAR_SERVERS].acquire()

        try {
            let servers = await Storage.get(StorageKey.POPULAR_SERVERS) as MastodonServersInfo;

            if (!servers || (await Storage.isDataStale(StorageKey.POPULAR_SERVERS))) {
                servers = await MastodonServer.mastodonServersInfo();
                await Storage.set(StorageKey.POPULAR_SERVERS, servers);
            } else {
                console.log(`Loaded ${StorageKey.POPULAR_SERVERS} from cache:`, servers);
            }

            return servers;
        } finally {
            releaseMutex();
        }
    };

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    async getTopServerDomains(): Promise<string[]> {
        const servers = await this.getMastodonServersInfo();

        // Sort the servers by the number of users on each server
        const topServerDomains = Object.keys(servers).sort(
            (a, b) => servers[b].followedPctOfMAU - servers[a].followedPctOfMAU
        );

        console.log(`[API] Found top server domains:`, topServerDomains, `\nbased on server data:`, servers);
        return topServerDomains;
    };

    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot: Toot): Promise<Toot> {
        console.debug(`resolveToot() called for`, toot);
        const tootURI = toot.realURI();
        const urlDomain = extractDomain(tootURI);
        if (urlDomain == this.homeDomain) return toot;
        const lookupResult = await this.api.v2.search.fetch({q: tootURI, resolve: true});

        if (!lookupResult?.statuses?.length) {
            const msg = `resolveToot('${tootURI}') got bad result:`;
            console.warn(msg, lookupResult);
            throw new Error(`${msg}\n${JSON.stringify(lookupResult)}`);
        }

        const resolvedStatus = lookupResult.statuses[0];
        console.debug(`resolveToot('${tootURI}') found resolvedStatus:`, resolvedStatus);
        return new Toot(resolvedStatus as Toot);
    };

    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    private async fetchData<T>(fetchParams: FetchParams<T>): Promise<T[]> {
        let { breakIf, fetch, label, maxId, maxRecords, skipCache } = fetchParams;
        const logPrefix = `[API ${label}]`;
        breakIf = breakIf || DEFAULT_BREAK_IF;
        maxRecords ||= Storage.getConfig().minRecordsForFeatureScoring;
        console.debug(`${logPrefix} fetchData() called (maxRecords=${maxRecords})`);
        const releaseFetchMutex = await this.mutexes[label].acquire();
        let results: T[] = [];
        let pageNumber = 0;

        try {
            if (!skipCache) {
                const cachedData = await Storage.get(label);

                if (cachedData && !(await Storage.isDataStale(label))) {
                    const rows = cachedData as T[];
                    console.log(`${logPrefix} Loaded ${rows.length} cached records:`, cachedData);
                    return rows;
                };
            }

            for await (const page of fetch(MastoApi.buildParams(maxId))) {
                results = results.concat(page as T[]);
                console.debug(`${logPrefix} Retrieved page ${++pageNumber}`);

                if (results.length >= maxRecords || breakIf(page, results)) {
                    console.debug(`${logPrefix} Halting fetch at page ${pageNumber} w/ ${results.length} records`);
                    break;
                }
            }

            console.log(`${logPrefix} Retrieved ${results.length} records:`, results);
            await Storage.set(label, results as StorableObj);
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} fetchData() for ${label} failed`)
            return results;
        } finally {
            releaseFetchMutex();
        }

        return results;
    };

    // Re-raise access revoked errors so they can trigger a logout() call
    private throwIfAccessTokenRevoked(e: unknown, msg: string): void {
        console.error(`${msg}. Error:`, e);
        if (!(e instanceof Error)) return;

        if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
            throw e;
        }
    }

    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    static buildParams(maxId?: number | string, limit?: number): mastodon.DefaultPaginationParams {
        let params: mastodon.DefaultPaginationParams = {
            limit: limit || Storage.getConfig().defaultRecordsPerPage
        };

        if (maxId) params = {...params, maxId: `${maxId}`};
        return params as mastodon.DefaultPaginationParams;
    };

    public static v1Url = (path: string) => `${API_V1}/${path}`;
    public static v2Url = (path: string) => `${API_V2}/${path}`;
    public static trendUrl = (path: string) => this.v1Url(`trends/${path}`);
};
