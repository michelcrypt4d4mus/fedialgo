/*
 * Helper methods for using mastodon API.
 */
import { mastodon } from "masto";

import getHomeFeed from "../feeds/home_feed";
import getRecentTootsForTrendingTags from "../feeds/trending_tags";
import getTrendingToots from "../feeds/trending_toots";
import MastodonApiCache from "./mastodon_api_cache";
import Storage from "../Storage";
import Toot from './objects/toot';
import { TimelineData, TrendingTag, UserData } from "../types";

const API_URI = "api"
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const STATUSES = "statuses"
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";


export class MastoApi {
    static #instance: MastoApi;
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;

    static init(api: mastodon.rest.Client, user: mastodon.v1.Account): void {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }

        MastoApi.#instance = new MastoApi(api, user);
    }

    public static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }

    private constructor(api: mastodon.rest.Client, user: mastodon.v1.Account) {
        this.api = api;
        this.user = user;
    }

    // Retrieve background data about the user that will be used for scoring etc.
    async getStartupData(): Promise<UserData> {
        const responses = await Promise.all([
            MastodonApiCache.getFollowedAccounts(this.api),
            MastodonApiCache.getFollowedTags(this.api),
            this.getServerSideFilters(),
        ]);

        return {
            followedAccounts: responses[0],
            followedTags: responses[1],
            serverSideFilters: responses[2],
        } as UserData;
    }

    // Get the user's recent toots
    // TODO: the args are unused hangover from pre-singleton era
    async getUserRecentToots(): Promise<Toot[]> {
        const recentToots = await mastodonFetchPages<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: 'recentToots'
        });

        return recentToots.map(t => new Toot(t));
    };

    // TODO: the args are unused hangover from pre-singleton era
    async fetchFollowedAccounts(): Promise<mastodon.v1.Account[]> {
        return await mastodonFetchPages<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            maxRecords: Storage.getConfig().maxFollowingAccountsToPull,
            label: 'followedAccounts'
        });
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
        let homeToots = allResponses.shift();

        return {
            homeToots: homeToots,
            otherToots: allResponses.flat(),
        } as TimelineData;
    }

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

    public static v1Url = (path: string) => `${API_V1}/${path}`;
    public static v2Url = (path: string) => `${API_V2}/${path}`;
    public static trendUrl = (path: string) => this.v1Url(`trends/${path}`);
};


// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    maxRecords?: number,
    label?: string,
    noParams?: boolean
};

export async function mastodonFetchPages<T>(fetchParams: FetchParams<T>): Promise<T[]> {
    let { fetch, maxRecords, label } = fetchParams;
    maxRecords ||= Storage.getConfig().minRecordsForFeatureScoring;
    label ||= "unknown";
    console.debug(`mastodonFetchPages() for ${label} w/ maxRecords=${maxRecords}, fetch:`, fetch);

    let results: T[] = [];
    let pageNumber = 0;

    try {
        for await (const page of fetch({ limit: Storage.getConfig().defaultRecordsPerPage })) {
            results = results.concat(page as T[]);
            console.log(`Retrieved page ${++pageNumber} of current user's ${label}...`);

            if (results.length >= maxRecords) {
                console.log(`Halting record retrieval at page ${pageNumber} w/ ${results.length} records...`);
                break;
            }
        }
    } catch (e) {
        throwIfAccessTokenRevoked(e, `mastodonFetchPages() for ${label} failed`)
        return results;
    }

    return results;
};


// re-raise access revoked errors.
export function throwIfAccessTokenRevoked(e: unknown, msg: string): void {
    console.error(`${msg}. Error:`, e);
    if (!(e instanceof Error)) return;

    if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
        throw e;
    }
};
