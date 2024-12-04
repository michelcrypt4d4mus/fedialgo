/*
 * Helper methods for using mastodon API.
 */
import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";

import { Toot } from "./types";

// Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
export const DEFAULT_RECORDS_PER_PAGE = 40;
const DEFAULT_MIN_RECORDS_FOR_FEATURE = 400;


export async function searchForToots(
    api: mastodon.rest.Client,
    searchQuery: string,
    limit: number = DEFAULT_RECORDS_PER_PAGE
): Promise<Toot[]> {
    console.debug(`[searchForToots] getting toots for query '${searchQuery}'`);
    const mastoQuery: mastodon.rest.v1.SearchParams = {limit: limit, q: searchQuery, type: "statuses"};

    try {
        const searchResult = await api.v2.search.fetch(mastoQuery);
        const toots = searchResult.statuses as Toot[];
        console.debug(`[searchForToots] Found toots for query`, mastoQuery);
        return toots;
    } catch (e) {
        console.warn(`[searchForToots] Failed to get toots for query '${searchQuery}':`, e);
        return [];
    }
};


// Retrieve Mastodon server information from a given server and endpoint
export const mastodonFetch = async <T>(server: string, endpoint: string): Promise<T | undefined> => {
    const url = `https://${server}${endpoint}`;
    console.debug(`mastodonFetch() ${url}'...`);

    try {
        const json = await axios.get<T>(url);
        console.debug(`mastodonFetch() response for ${url}:`, json);

        if (json.status === 200 && json.data) {
            return transformKeys(json.data, camelCase);
        } else {
            throw json;
        }
    } catch (error) {
        console.warn(`Error fetching data for server ${server} from endpoint '${endpoint}'`, error);
        return;
    }
};


interface FetchParams<T> {
    fetchMethod: (params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>,
    maxRecords?: number,
    label?: string,
};

// Fetch min_pages pages of a user's [whatever] (toots, notifications, etc.) from the API and return an array
export async function mastodonFetchPages<T>(fetchParams: FetchParams<T>): Promise<T[]> {
    let { fetchMethod, maxRecords, label } = fetchParams;
    maxRecords ||= DEFAULT_MIN_RECORDS_FOR_FEATURE;
    label ||= "unknown";
    console.debug(`mastodonFetchPages() for ${label} w/ maxRecords=${maxRecords}, fetchMethod:`, fetchMethod);
    let results: T[] = [];
    let pageNumber = 0;

    try {
        for await (const page of fetchMethod({ limit: DEFAULT_RECORDS_PER_PAGE })) {
            results = results.concat(page as T[]);
            console.log(`Retrieved page ${++pageNumber} of current user's ${label}...`);

            if (results.length >= maxRecords) {
                console.log(`Halting record retrieval at page ${pageNumber} w/ ${results.length} records...`);
                break;
            }
        }
    } catch (e) {
        console.error(`Error in mastodonFetchPages():`, e);
        return results;
    }

    return results;
};


// Apply a transform() function to all keys in a nested object.
export const transformKeys = <T>(data: T, transform: (key: string) => string): T => {
    if (Array.isArray(data)) {
        return data.map((value) => transformKeys<T>(value, transform)) as T;
    }

    if (isRecord(data)) {
        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
                transform(key),
                transformKeys(value, transform),
            ]),
        ) as T;
    }

    return data as T;
};


//Masto does not support top posts from foreign servers, so we have to do it manually
const isRecord = (x: unknown): x is Record<string, unknown> => {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
};
