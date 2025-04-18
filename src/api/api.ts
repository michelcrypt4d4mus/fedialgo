/*
 * Helper methods for using mastodon API.
 */
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import fetchRecentTootsForTrendingTags from "../feeds/trending_tags";
import MastodonServer from "./mastodon_server";
import Storage from "../Storage";
import Toot, { earliestTootedAt } from './objects/toot';
import { AccountLike, Key, StorageKey, StorableObj, StringNumberDict, TimelineData, UserData, WeightName} from "../types";
import { buildAccountNames } from "./objects/account";
import { extractDomain } from "../helpers";
import { repairTag } from "./objects/tag";
import { sortKeysByValue } from '../helpers';

type ApiMutex = Record<StorageKey, Mutex>;

export const INSTANCE = "instance";
export const LINKS = "links";
export const STATUSES = "statuses";
export const TAGS = "tags";

const API_URI = "api"
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const DEFAULT_BREAK_IF = (pageOfResults: any[], allResults: any[]) => false;


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
    user: mastodon.v1.Account;
    homeDomain: mastodon.v1.Account["url"];
    mutexes: ApiMutex;
    static #instance: MastoApi;

    static init(api: mastodon.rest.Client, user: mastodon.v1.Account): void {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }

        console.log(`[MastoApi] Initializing MastoApi instance with user:`, user);
        MastoApi.#instance = new MastoApi(api, user);
    };

    public static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    };

    private constructor(api: mastodon.rest.Client, user: mastodon.v1.Account) {
        this.api = api;
        this.user = user;
        this.homeDomain = extractDomain(user.url);

        // Initialize mutexes for each key in Key and WeightName
        this.mutexes = {} as ApiMutex;
        for (const key in Key) this.mutexes[Key[key as keyof typeof Key]] = new Mutex();
        for (const key in WeightName) this.mutexes[WeightName[key as keyof typeof WeightName]] = new Mutex();
    };

    // Get the toots that make up the user's home timeline feed
    async getTimelineToots(numTimelineToots?: number, maxId?: string): Promise<TimelineData> {
        console.debug(`[MastoApi] getFeed(numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots ||= Storage.getConfig().numTootsInFirstFetch;

        let promises: Promise<any>[] = [
            this.fetchHomeFeed(numTimelineToots, maxId),
        ];

        // Only fetch trending toots first time this is called (skip when paging through timeline)
        if (!maxId) {
            promises = promises.concat([
                MastodonServer.fediverseTrendingToots(),
                fetchRecentTootsForTrendingTags(),  // ORDER MATTERS! must be 2nd for handling below
            ]);
        }

        const allResponses = await Promise.all(promises);
        console.debug(`[MastoApi] getFeed() allResponses: ${JSON.stringify(allResponses, null, 4)}`);
        const homeToots = allResponses.shift();  // Pop timeline toots off the array
        let trendingTags, trendingToots, trendingTagToots;
        let otherToots = [];

        if (allResponses.length > 0) {
            trendingToots = allResponses.shift();
            trendingTagToots = allResponses.shift();
            trendingTags = trendingTagToots.tags;
            otherToots = trendingToots.concat(trendingTagToots.toots);
            console.debug(`Extracted trendingTags during load:`, trendingTags);
        }

        return {
            homeToots,
            otherToots,
            trendingTags,
            trendingToots,
        } as TimelineData;
    };

    // Retrieve background data about the user that will be used for scoring etc.
    async getStartupData(): Promise<UserData> {
        const responses = await Promise.all([
            this.fetchBlockedAccounts(),
            this.fetchMutedAccounts(),
            this.getServerSideFilters(),
        ]);

        return {
            mutedAccounts: buildAccountNames(responses[0].concat(responses[1])),
            serverSideFilters: responses[2],
        } as UserData;
    };

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags)
    async fetchHomeFeed(numToots?: number, maxId?: string | number): Promise<Toot[]> {
        const timelineLookBackMS = Storage.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
        const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);

        const statuses = await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.timelines.home.list,
            label: Key.HOME_TIMELINE,
            maxId: maxId,
            maxRecords: numToots || Storage.getConfig().maxTimelineTootsToFetch,
            skipCache: true,  // always skip the cache for the home timeline
            breakIf: (pageOfResults, allResults) => {
                const oldestTootAt = earliestTootedAt(allResults) || new Date();
                console.log(`oldest in page: ${earliestTootedAt(pageOfResults)}, oldest: ${oldestTootAt})`);

                if (oldestTootAt && oldestTootAt < cutoffTimelineAt) {
                    console.log(`Halting fetchHomeFeed() pages bc oldestTootAt='${oldestTootAt}'`);
                    return true;
                }

                return false;
            }
        });

        const toots = statuses.map((status) => new Toot(status));
        console.debug(`fetchHomeFeed() found ${toots.length} toots (oldest: '${earliestTootedAt(toots)}'):`, toots);
        return toots;
    };

    // the search API can be used to search for toots, profiles, or hashtags. this is for toots.
    async searchForToots(searchQuery: string, limit?: number): Promise<Toot[]> {
        limit = limit || Storage.getConfig().defaultRecordsPerPage;
        console.debug(`[searchForToots] getting toots for query '${searchQuery}'`);
        const mastoQuery: mastodon.rest.v1.SearchParams = {limit: limit, q: searchQuery, type: STATUSES};

        try {
            const searchResult = await this.api.v2.search.fetch(mastoQuery);
            const toots = searchResult.statuses.map(t => new Toot(t));
            console.debug(`[searchForToots] Found toots for query`, mastoQuery);
            return toots;
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `Failed to get toots for query '${searchQuery}'`);
            return [];
        }
    };

    // Get the user's recent toots
    async getUserRecentToots(): Promise<Toot[]> {
        const recentToots = await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: Key.RECENT_USER_TOOTS
        });

        return recentToots.map(t => new Toot(t));
    };

    // Get accounts the user is following
    async fetchFollowedAccounts(): Promise<mastodon.v1.Account[]> {
        return await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: Key.FOLLOWED_ACCOUNTS,
            maxRecords: Storage.getConfig().maxFollowingAccountsToPull,
        });
    };

    // Get hashtags the user is following
    async getFollowedTags(): Promise<mastodon.v1.Tag[]> {
        const followedTags = await this.fetchData<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            label: WeightName.FOLLOWED_TAGS
        });

        return followedTags.map(repairTag);
    }

    // Get the user's recent notifications
    async getRecentNotifications(): Promise<mastodon.v1.Notification[]> {
        return await this.fetchData<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            label: Key.RECENT_NOTIFICATIONS
        });
    }

    // Get an array of Toots the user has recently favourited
    async fetchRecentFavourites(): Promise<mastodon.v1.Status[]> {
        return await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.favourites.list,
            label: WeightName.FAVORITED_ACCOUNTS
        });
    };

    async fetchBlockedAccounts(): Promise<mastodon.v1.Account[]> {
        return await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.blocks.list,
            label: Key.BLOCKED_ACCOUNTS
        });
    };

    async fetchMutedAccounts(): Promise<mastodon.v1.Account[]> {
        return await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.mutes.list,
            label: Key.MUTED_ACCOUNTS
        });
    };

    // TODO: should we cache this?
    async getServerSideFilters(): Promise<mastodon.v2.Filter[]> {
        console.log(`getServerSideFilters() called`);
        let filters = await this.api.v2.filters.list();

        // Filter out filters that either are just warnings or don't apply to the home context
        filters = filters.filter(filter => {
            // before 4.0 Filter objects lacked a 'context' property altogether
            if (filter.context?.length > 0 && !filter.context.includes("home")) return false;
            if (filter.filterAction != "hide") return false;
            return true;
        });

        console.log(`Retrieved server side filters:`, filters);
        return filters;
    };

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    async getTopServerDomains(): Promise<string[]> {
        const releaseMutex = await this.mutexes[Key.POPULAR_SERVERS].acquire()

        try {
            let servers = await Storage.get(Key.POPULAR_SERVERS) as StringNumberDict;;

            if (!servers || (await this.shouldReloadFeatures())) {
                servers = await MastodonServer.mastodonServersInfo();
                await Storage.set(Key.POPULAR_SERVERS, servers);
            } else {
                console.log(`Loaded popular servers from cache:`, servers);
                servers = servers as StringNumberDict;
            }

            const topServerDomains = sortKeysByValue(servers);
            console.log(`[API] Found top server domains:`, topServerDomains);
            return topServerDomains;
        } finally {
            releaseMutex();
        }
    };

    // "https://universeodon.com/@JoParkerBear@universeodon.com" => "https://universeodon.com/@JoParkerBear"
    // TODO: maybe rename to getLocalAccountURL()?
    getAccountURL(account: AccountLike): string {
        if (account.url.endsWith(`@${this.homeDomain}`)) {
            return account.url.substring(0, account.url.lastIndexOf('@'));
        } else {
            return account.url;
        }
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
        const lookupResult = await this.api.v2.search.fetch({ q: tootURI, resolve: true });

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
    private async fetchData<T>(fetchParams: FetchParams<T>): Promise<T[]> {
        let { breakIf, fetch, label, maxId, maxRecords, skipCache } = fetchParams;
        breakIf = breakIf || DEFAULT_BREAK_IF;
        maxRecords ||= Storage.getConfig().minRecordsForFeatureScoring;
        console.debug(`[API] ${label}: fetchData() called (maxRecords=${maxRecords})`);
        const releaseFetchMutex = await this.mutexes[label].acquire();
        let results: T[] = [];
        let pageNumber = 0;

        try {
            if (!skipCache) {
                const cachedData = await Storage.get(label);

                if (cachedData && !(await this.shouldReloadFeatures())) {
                    const rows = cachedData as T[];
                    console.log(`[API] ${label}: Loaded ${rows.length} cached records:`, cachedData);
                    return rows;
                };
            }

            for await (const page of fetch(MastoApi.buildParams(maxId))) {
                results = results.concat(page as T[]);
                console.debug(`[API] ${label}: Retrieved page ${++pageNumber}`);

                if (results.length >= maxRecords || breakIf(page, results)) {
                    console.log(`[API] ${label}: Halting fetch at page ${pageNumber} w/ ${results.length} records`);
                    break;
                }
            }

            console.log(`[API] ${label}: Fetched ${results.length} records:`, results);
            await Storage.set(label, results as StorableObj);
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `fetchData() for ${label} failed`)
            return results;
        } finally {
            releaseFetchMutex();
        }

        return results;
    };

    // This doesn't quite work as advertised. It actually forces a reload every 10 app opens
    // starting at the 9th one. Also bc of the way it was implemented it won't work the same
    // way for any number other than 9.
    private async shouldReloadFeatures() {
        return (await Storage.getNumAppOpens()) % 10 == Storage.getConfig().reloadFeaturesEveryNthOpen;
    }

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
