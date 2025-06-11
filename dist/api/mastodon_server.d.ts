import TagList from "./tag_list";
import Toot from "./objects/toot";
import { Logger } from '../helpers/logger';
import { type MastodonInstance, type MastodonInstances, type TagWithUsageCounts, type TrendingLink, type TrendingData } from "../types";
export type InstanceResponse = MastodonInstance | null;
/**
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 * Provides methods to fetch trending toots, tags, links, and server info, as well as utilities for
 * aggregating and processing trending data across multiple servers in the fediverse.
 *
 * @class
 * @property {string} domain - The domain of the server this MastodonServer object interacts with.
 * @property {Logger} logger - Logger instance for this server.
 */
export default class MastodonServer {
    domain: string;
    logger: Logger;
    private static v1Url;
    private static v2Url;
    private static trendUrl;
    private static trendingMutexes;
    /**
     * Constructs a MastodonServer instance for the given domain.
     * @param {string} domain - The domain of the Mastodon server.
     */
    constructor(domain: string);
    /**
     * Fetch the mastodon.v2.Instance object (MAU, version, languages, rules, etc) for this server.
     * @returns {Promise<InstanceResponse>} The instance info or null if not available.
     */
    fetchServerInfo(): Promise<InstanceResponse>;
    /**
     * Fetch toots that are trending on this server.
     * Note: Returned toots have not had setDependentProps() called yet.
     * TODO: should return SerializableToot[] instead of mastodon.v1.Status but the type system is annoying.
     * @returns {Promise<Toot[]>} Array of trending Toot objects.
     */
    fetchTrendingStatuses(): Promise<Toot[]>;
    /**
     * Get the links that are trending on this server.
     * @returns {Promise<TrendingLink[]>} Array of trending links.
     */
    fetchTrendingLinks(): Promise<TrendingLink[]>;
    /**
     * Get the tags that are trending on this server.
     * @returns {Promise<TagWithUsageCounts[]>} Array of trending tags with usage counts.
     */
    fetchTrendingTags(): Promise<TagWithUsageCounts[]>;
    private fetch;
    private fetchList;
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
     * @returns {Promise<TagList>} TagList of trending tags across all servers.
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
    static getMastodonInstancesInfo(): Promise<MastodonInstances>;
    /**
     * Collect all three kinds of trending data (links, tags, toots) in one call.
     * @static
     * @returns {Promise<TrendingData>} Object containing trending links, tags, toots, and servers.
     */
    static getTrendingData(): Promise<TrendingData>;
    private static fetchMastodonInstances;
    private static getTrendingObjsFromAllServers;
    private static getTopServerDomains;
    private static callForServers;
    private static callForTopServers;
    private endpointUrl;
    private static isNoMauServer;
}
