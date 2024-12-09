/*
 * Helper methods for using mastodon API.
 */
import { Mutex } from 'async-mutex';
import { mastodon } from "masto";

import getHomeFeed from "../feeds/home_feed";
import getRecentTootsForTrendingTags from "../feeds/trending_tags";
import getTrendingToots from "../feeds/trending_toots";
import mastodonServersInfo from "./mastodon_servers_info";
import Storage from "../Storage";
import Toot from './objects/toot';
import { buildAccountNames } from "./objects/account";
import { countValues } from '../helpers';
import {
    AccountNames,
    Key,
    StorageKey,
    StorageValue,
    StringNumberDict,
    TimelineData,
    UserData,
    WeightName
} from "../types";

const API_URI = "api"
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const STATUSES = "statuses"
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";

type ApiMutex = Record<StorageKey, Mutex>;

// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    label: StorageKey,
    maxRecords?: number,
};


// Singleton class for interacting with the Mastodon API
export class MastoApi {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    mutexes: ApiMutex;
    static #instance: MastoApi;

    static init(api: mastodon.rest.Client, user: mastodon.v1.Account): void {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }

        MastoApi.#instance = new MastoApi(api, user);
    };

    public static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    };

    private constructor(api: mastodon.rest.Client, user: mastodon.v1.Account) {
        this.api = api;
        this.user = user;
        this.mutexes = {} as ApiMutex;

        // Initialize mutexes for each key in Key and WeightName
        for (const key in Key) this.mutexes[Key[key as keyof typeof Key]] = new Mutex();
        for (const key in WeightName) this.mutexes[WeightName[key as keyof typeof WeightName]] = new Mutex();
    };

    // Get the toots that make up the user's home timeline feed
    async getTimelineToots(numTimelineToots?: number, maxId?: string): Promise<TimelineData> {
        console.debug(`[MastoApi] getFeed(numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage.getConfig().numTootsInFirstFetch;
        let promises: Promise<any>[] = [getHomeFeed(this.api, numTimelineToots, maxId)]

        // Only retrieve trending toots on the first call to this method
        if (!maxId) {
            promises = promises.concat([
                getTrendingToots(this.api),
                getRecentTootsForTrendingTags(this.api),
            ]);
        }

        const allResponses = await Promise.all(promises);
        console.debug(`[MastoApi] getFeed() allResponses:`, allResponses);
        const homeToots = allResponses.shift();

        return {
            homeToots: homeToots,
            otherToots: allResponses.flat(),
        } as TimelineData;
    };

    // Retrieve background data about the user that will be used for scoring etc.
    async getStartupData(): Promise<UserData> {
        const responses = await Promise.all([
            this.fetchFollowedAccounts(),
            this.getFollowedTags(),
            this.getServerSideFilters(),
        ]);

        return {
            followedAccounts: buildAccountNames(responses[0]),
            followedTags: countValues<mastodon.v1.Tag>(responses[1], (tag) => tag.name.toLowerCase()),
            serverSideFilters: responses[2],
        } as UserData;
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
            throwIfAccessTokenRevoked(e, `Failed to get toots for query '${searchQuery}'`);
            return [];
        }
    };

    // Get the user's recent toots
    async getUserRecentToots(): Promise<Toot[]> {
        const recentToots = await this.mastodonFetchPages<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: Key.RECENT_USER_TOOTS
        });

        return recentToots.map(t => new Toot(t));
    };

    async getFollowedAccounts(): Promise<AccountNames> {
        return buildAccountNames(await this.fetchFollowedAccounts());
    };

    async fetchFollowedAccounts(): Promise<mastodon.v1.Account[]> {
        return await this.mastodonFetchPages<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: Key.FOLLOWED_ACCOUNTS,
            maxRecords: Storage.getConfig().maxFollowingAccountsToPull,
        });
    };

    // Get a count of number of favorites for each account in the user's recent favorites
    async getMostFavouritedAccounts(): Promise<StringNumberDict> {
        const recentFavoriteToots = await this.fetchRecentFavourites();
        return countValues<mastodon.v1.Status>(recentFavoriteToots, (toot) => toot.account?.acct);
    }

    async getFollowedTags(): Promise<mastodon.v1.Tag[]> {
        return await this.mastodonFetchPages<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            label: WeightName.FOLLOWED_TAGS
        });
    }

    async getRecentNotifications(): Promise<mastodon.v1.Notification[]> {
        return await this.mastodonFetchPages<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            label: Key.RECENT_NOTIFICATIONS
        });
    }

    // Get an array of Toots the user has recently favourited
    async fetchRecentFavourites(): Promise<mastodon.v1.Status[]> {
        return await this.mastodonFetchPages<mastodon.v1.Status>({
            fetch: this.api.v1.favourites.list,
            label: WeightName.FAVORITED_ACCOUNTS
        });
    };

    // TODO: should we cache this?
    async getServerSideFilters(): Promise<mastodon.v2.Filter[]> {
        console.log(`getServerSideFilters() called`);
        // let filters = await this.get(Key.SERVER_SIDE_FILTERS) as mastodon.v2.Filter[];
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
    }

    // Returns information about mastodon servers
    async getCoreServer(): Promise<StringNumberDict> {
        return await mastodonServersInfo(await this.fetchFollowedAccounts());
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    async getTopServerDomains(api: mastodon.rest.Client): Promise<string[]> {
        const coreServers = await this.getCoreServer();

        // Count the number of followed users per server
        const topServerDomains = Object.keys(coreServers)
                                       .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
                                       .sort((a, b) => (coreServers[b] - coreServers[a]));

        console.log(`[API] Found top server domains:`, topServerDomains);
        return topServerDomains;
    };

    private async mastodonFetchPages<T>(fetchParams: FetchParams<T>): Promise<T[]> {
        let { fetch, maxRecords, label } = fetchParams;
        maxRecords ||= Storage.getConfig().minRecordsForFeatureScoring;
        console.debug(`[API] ${label}: mastodonFetchPages() w/ maxRecords=${maxRecords}`);
        const releaseMutex = await this.mutexes[label].acquire();
        let results: T[] = [];
        let pageNumber = 0;

        try {
            const cachedData = await Storage.get(label);

            if (cachedData && !(await this.shouldReloadFeatures())) {
                const rows = cachedData as T[];
                console.log(`[API] ${label}: Loaded ${rows.length} cached records:`, cachedData);
                return rows as T[];
            };

            for await (const page of fetch({ limit: Storage.getConfig().defaultRecordsPerPage })) {
                results = results.concat(page as T[]);
                console.log(`[API] ${label}: Retrieved page ${++pageNumber} of current user's ${label}...`);

                if (results.length >= maxRecords) {
                    console.log(`[API] ${label}: Halting record retrieval at page ${pageNumber} w/ ${results.length} records`);
                    break;
                }
            }

            console.log(`[API] ${label}: Fetched ${results.length} records:`, results);
            await Storage.set(label, results as StorageValue);
        } catch (e) {
            throwIfAccessTokenRevoked(e, `mastodonFetchPages() for ${label} failed`)
            return results;
        } finally {
            releaseMutex();
        }

        return results;
    };

    // This doesn't quite work as advertised. It actually forces a reload every 10 app opens
    // starting at the 9th one. Also bc of the way it was implemented it won't work the same
    // way for any number other than 9.
    private async shouldReloadFeatures() {
        return (await Storage.getNumAppOpens()) % 10 == Storage.getConfig().reloadFeaturesEveryNthOpen;
    }

    public static v1Url = (path: string) => `${API_V1}/${path}`;
    public static v2Url = (path: string) => `${API_V2}/${path}`;
    public static trendUrl = (path: string) => this.v1Url(`trends/${path}`);
};


// re-raise access revoked errors.
export function throwIfAccessTokenRevoked(e: unknown, msg: string): void {
    console.error(`${msg}. Error:`, e);
    if (!(e instanceof Error)) return;

    if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
        throw e;
    }
};
