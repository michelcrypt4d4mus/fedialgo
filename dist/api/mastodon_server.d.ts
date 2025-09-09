import TagList from "./tag_list";
import Toot from "./objects/toot";
import { Logger } from '../helpers/logger';
import { type InstanceResponse, type MastodonInstances, type TagWithUsageCounts, type TrendingData, type TrendingLink } from "../types";
/**
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 * Provides methods to fetch trending toots, tags, links, and server info, as well as utilities for
 * aggregating and processing trending data across multiple servers in the fediverse.
 * @class
 * @property {string} domain - Domain of the server this {@linkcode MastodonServer} instance interacts with.
 * @property {Logger} logger - {@linkcode Logger} instance for this server.
 */
export default class MastodonServer {
    domain: string;
    logger: Logger;
    /**
     * Constructs a {@linkcode MastodonServer} instance for the given domain.
     * @param {string} domain - The domain of the Mastodon server.
     */
    constructor(domain: string);
    /**
     * Fetch the {@link https://docs.joinmastodon.org/entities/Instance/ mastodon.v2.Instance} (MAU,
     * version, languages, rules, etc) for this server.
     * @returns {Promise<InstanceResponse>} The instance info or null if not available.
     */
    fetchServerInfo(): Promise<InstanceResponse>;
    /**
     * Get the links that are trending on this server.
     * @returns {Promise<TrendingLink[]>} Array of trending links.
     */
    fetchTrendingLinks(): Promise<TrendingLink[]>;
    /**
     * Fetch {@linkcode Toot}s that are trending on this server.
     * Note: Returned {@linkcode Toot}s have not had {@linkcode Toot.completeProperties} called yet.
     * @returns {Promise<Toot[]>} Array of trending Toot objects.
     */
    fetchTrendingStatuses(): Promise<Toot[]>;
    /**
     * Get the tags that are trending on this server.
     * @returns {Promise<TagWithUsageCounts[]>} Array of trending tags with usage counts.
     */
    fetchTrendingTags(): Promise<TagWithUsageCounts[]>;
    /**
     * Get data from a public API endpoint on a Mastodon server.
     * @private
     * @param {string} endpoint - The API endpoint to fetch data from.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T>} The data fetched from the endpoint, with keys transformed to camelCase.
     */
    private fetch;
    /**
     * Fetch a list of objects of type T from a public API endpoint
     * @private
     * @param {string} endpoint - The API endpoint to fetch data from.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T[]>} Array of objects of type T.
     */
    private fetchList;
    /**
     * Generic trending data fetcher: Fetch a list of objects of type T from a public API endpoint.
     * @private
     * @param {string} trendingType - The type of trending data to fetch (e.g., 'statuses', 'tags', 'links').
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T[]>} Array of objects of type T.
     */
    private fetchTrending;
    /**
     * Get the top trending links from all servers in the fediverse.
     * @static
     * @returns {Promise<TrendingLink[]>} Array of trending links across all servers.
     */
    static fediverseTrendingLinks(): Promise<TrendingLink[]>;
    /**
     * Get the top trending tags from all servers, minus any invalid or muted tags.
     * @static
     * @returns {Promise<TagList>} {@linkcode TagList} of trending tags across all servers.
     */
    static fediverseTrendingTags(): Promise<TagList>;
    /**
     * Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
     * @static
     * @returns {Promise<Toot[]>} Array of trending Toots across all servers.
     */
    static fediverseTrendingToots(): Promise<Toot[]>;
    /**
     * Get the server names that are most relevant to the user (appears in follows a lot, mostly).
     * @static
     * @returns {Promise<MastodonInstances>} Dictionary of MastodonInstances keyed by domain.
     */
    static getMastodonInstances(): Promise<MastodonInstances>;
    /**
     * Collect all three kinds of trending data (links, tags, toots) in one call.
     * @static
     * @returns {Promise<TrendingData>} Object containing trending links, tags, toots, and servers.
     */
    static getTrendingData(): Promise<TrendingData>;
    /**
     * Returns a dict of servers with MAU over the {@linkcode minServerMAU} threshold
     * and the ratio of the number of users followed on a server to the MAU of that server.
     * @private
     * @static
     * @returns {Promise<MastodonInstances>} Dictionary of MastodonInstances keyed by domain.
     */
    private static fetchMastodonInstances;
    /**
     * Generic wrapper to fetch trending data from all servers and process it into an array of unique objects.
     * @private
     * @static
     * @param {FetchTrendingProps<T>} props - Properties for fetching and processing trending data.
     * @returns {Promise<T[]>} Array of unique objects of type T.
     */
    private static getTrendingObjsFromAllServers;
    /**
     * Get the server names that are most relevant to the user (appears in follows a lot, mostly).
     * @private
     * @static
     * @returns {Promise<string[]>} Array of top server domains.
     */
    private static getTopServerDomains;
    /**
     * Call {@linkcode fxn} for a list of domains and return a dict keyed by domain.
     * @private
     * @static
     * @template T - The type of the result returned by the function.
     * @param {string[]} domains - Array of server domains to call the function on.
     * @param {(server: MastodonServer) => Promise<T>} fxn - The function to call for each server.
     * @returns {Promise<Record<string, T>>} A promise that resolves to a dictionary with domains as keys and results of type T as values.
     */
    private static callForServers;
    /**
     * Call {@linkcode fxn} for all the top servers and return a dict keyed by server domain.
     * @private
     * @static
     * @template T - The type of the result returned by the function.
     * @param {(server: MastodonServer) => Promise<T>} fxn - The function to call for each server.
     * @returns {Promise<Record<string, T>>} A promise that resolves to a dictionary with domains as keys and results of type T as values.
     */
    private static callForTopServers;
    /**
     * Build the full URL for a given API endpoint on this server, optionally adding a limit parameter.
     * @private
     * @param {string} endpoint - The API endpoint to build the URL for.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {string} The full URL for the API endpoint.
     */
    private endpointUrl;
    /**
     * Returns true if the domain is known to not provide MAU and trending data via public API
     * @private
     * @static
     * @param {string} domain - The domain to check.
     * @returns {boolean} True if the domain is in the `noMauServers` list, false otherwise.
     */
    private static isNoMauServer;
    /** Build a URL for a trending type (tags, links, toots). */
    private static trendUrl;
    /** Build a v1 API URL. */
    private static v1Url;
    /** Build a v2 API URL. */
    private static v2Url;
}
