/*
 * Helper methods for using mastodon API.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";

import getHomeFeed from "../feeds/home_feed";
import getRecentTootsForTrendingTags from "../feeds/trending_tags";
import getTrendingToots from "../feeds/trending_toots";
import MastodonApiCache from "./mastodon_api_cache";
import Storage from "../Storage";
import { TimelineData, Toot, TrendingTag, UserData } from "../types";
import { transformKeys } from "../helpers";

export const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const API_URI = "api"
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const SERVER_MAU_ENDPOINT = `${API_V2}/instance`;
export const FILTER_ENDPOINT = `${API_V2}/filters`;


export class MastoApi {
    api: mastodon.rest.Client;

    constructor(api: mastodon.rest.Client) {
        this.api = api;
    }

    // Retrieve background data about the user that will be used for scoring etc.
    async getStartupData(): Promise<UserData> {
        const responses = await Promise.all([
            MastodonApiCache.getFollowedAccounts(this.api),
            MastodonApiCache.getFollowedTags(this.api),
            MastodonApiCache.getServerSideFilters(this.api),
        ]);

        return {
            followedAccounts: responses[0],
            followedTags: responses[1],
            serverSideFilters: responses[2],
        } as UserData;
    }

    // Get the toots that make up the user's home timeline feed
    async getFeed(numTimelineToots?: number, maxId?: string): Promise<TimelineData> {
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

    static v1Url(path: string): string {
        return `${API_V1}/${path}`;
    }

    static v2Url(path: string): string {
        return `${API_V2}/${path}`;
    }

    static trendUrl(path: string): string {
        return this.v1Url(path);
    }
};


// Use the API to search for recent toots containing a 'searchQuery' string
export async function searchForToots(
    api: mastodon.rest.Client,
    searchQuery: string,
    limit: number | null = null
): Promise<Toot[]> {
    limit = limit || Storage.getConfig().defaultRecordsPerPage;
    console.debug(`[searchForToots] getting toots for query '${searchQuery}'`);
    const mastoQuery: mastodon.rest.v1.SearchParams = {limit: limit, q: searchQuery, type: "statuses"};

    try {
        const searchResult = await api.v2.search.fetch(mastoQuery);
        const toots = searchResult.statuses as Toot[];
        console.debug(`[searchForToots] Found toots for query`, mastoQuery);
        return toots;
    } catch (e) {
        throwIfAccessTokenRevoked(e, `Failed to get toots for query '${searchQuery}'`);
        return [];
    }
};


// Retrieve Mastodon server information from a given server and endpoint
export const mastodonFetch = async <T>(
    server: string,
    endpoint: string,
    limit: number | null = null
): Promise<T | undefined> => {
    let url = `https://${server}${endpoint}`;
    if (limit) url += `?limit=${limit}`;
    console.debug(`mastodonFetch() ${url}'...`);

    try {
        const json = await axios.get<T>(url);
        console.debug(`mastodonFetch() response for ${url}:`, json);

        if (json.status === 200 && json.data) {
            return transformKeys(json.data, camelCase);
        } else {
            throw json;
        }
    } catch (e) {
        console.warn(`Error fetching data for server ${server} from endpoint '${endpoint}'`, e);
        return;
    }
};


// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
        // ((meta?: undefined) => mastodon.Paginator<T[], undefined>),
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


// Get publicly available MAU information. Requires no login (??)
export async function getMonthlyUsers(server: string): Promise<number> {
    if (Storage.getConfig().noMauServers.some(s => server.startsWith(s))) {
        console.debug(`monthlyUsers() for '${server}' is not available`);
        return 0;
    }

    try {
        const instance = await mastodonFetch<mastodon.v2.Instance>(server, SERVER_MAU_ENDPOINT);
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    } catch (error) {
        console.warn(`Error in getMonthlyUsers() for server ${server}`, error);
        return 0;
    }
};


// Get the user's recent toots
export async function getUserRecentToots(
    api: mastodon.rest.Client,
    user: mastodon.v1.Account
): Promise<Toot[]> {
    const recentToots = await mastodonFetchPages<mastodon.v1.Status>({
        fetch: api.v1.accounts.$select(user.id).statuses.list,
        label: 'recentToots'
    });

    return recentToots as Toot[];
};


// Get latest toots for a given tag
export async function getTootsForTag(api: mastodon.rest.Client, tag: TrendingTag): Promise<Toot[]> {
    try {
        // TODO: this doesn't append a an octothorpe to the tag name. Should it?
        const toots = await searchForToots(api, tag.name, Storage.getConfig().numTootsPerTrendingTag);

        // Inject the tag into each toot as a trendingTag element
        toots.forEach((toot) => {
            toot.trendingTags ||= [];
            toot.trendingTags.push(tag);
        });

        console.debug(`Found toots for tag '${tag.name}':`, toots);
        return toots;
    } catch (e) {
        throwIfAccessTokenRevoked(e, `Failed to get toots for tag '${tag.name}'`);
        return [];
    }
};


// re-raise access revoked errors.
function throwIfAccessTokenRevoked(e: unknown, msg: string): void {
    console.error(`${msg}. Error:`, e);
    if (!(e instanceof Error)) return;

    if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
        throw e;
    }
};
