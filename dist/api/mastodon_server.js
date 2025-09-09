"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
const axios_1 = __importDefault(require("axios"));
const change_case_1 = require("change-case");
const async_mutex_1 = require("async-mutex");
const api_1 = __importDefault(require("./api"));
const Storage_1 = __importDefault(require("../Storage"));
const tag_list_1 = __importDefault(require("./tag_list"));
const toot_1 = __importDefault(require("./objects/toot"));
const time_helpers_1 = require("../helpers/time_helpers");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const enums_1 = require("../enums");
const mutex_helpers_1 = require("../helpers/mutex_helpers");
const logger_1 = require("../helpers/logger");
const string_helpers_1 = require("../helpers/string_helpers");
const trending_with_history_1 = require("./objects/trending_with_history");
const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const INSTANCE = "instance";
const LOG_PREFIX = `MastodonServer`;
const buildLogger = logger_1.Logger.logBuilder(LOG_PREFIX);
const loggers = logger_1.Logger.buildEnumLoggers(enums_1.FediverseCacheKey);
const mutexes = (0, enums_1.simpleCacheKeyDict)(() => new async_mutex_1.Mutex(), Object.values(enums_1.FediverseCacheKey));
function getLogger(key, methodName) {
    return methodName ? loggers[key].tempLogger(methodName) : loggers[key];
}
;
;
/**
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 * Provides methods to fetch trending toots, tags, links, and server info, as well as utilities for
 * aggregating and processing trending data across multiple servers in the fediverse.
 * @class
 * @property {string} domain - The domain of the server this MastodonServer object interacts with.
 * @property {Logger} logger - Logger instance for this server.
 */
class MastodonServer {
    domain;
    logger;
    /**
     * Constructs a MastodonServer instance for the given domain.
     * @param {string} domain - The domain of the Mastodon server.
     */
    constructor(domain) {
        this.domain = domain;
        this.logger = logger_1.Logger.withParenthesizedName(LOG_PREFIX, domain);
    }
    /**
     * Fetch the mastodon.v2.Instance object (MAU, version, languages, rules, etc) for this server.
     * @returns {Promise<InstanceResponse>} The instance info or null if not available.
     */
    async fetchServerInfo() {
        try {
            return await this.fetch(MastodonServer.v2Url(INSTANCE));
        }
        catch (error) {
            // TODO: we shouldn't have to catch this error here because zipPromises() will take care of it
            this.logger.tempLogger('fetchServerInfo').warn(`Error for server '${this.domain}'`, error);
            return null;
        }
    }
    /**
     * Get the links that are trending on this server.
     * @returns {Promise<TrendingLink[]>} Array of trending links.
     */
    async fetchTrendingLinks() {
        if (config_1.config.fediverse.noTrendingLinksServers.includes(this.domain)) {
            this.logger.debug(`Trending links are not available for '${this.domain}', skipping...`);
            return [];
        }
        const numLinks = config_1.config.trending.links.numTrendingLinksPerServer;
        const trendingLinks = await this.fetchTrending(enums_1.TrendingType.LINKS, numLinks);
        return trendingLinks.map(trending_with_history_1.decorateLinkHistory);
    }
    /**
     * Fetch toots that are trending on this server.
     * Note: Returned toots have not had setDependentProps() called yet.
     * @returns {Promise<Toot[]>} Array of trending Toot objects.
     */
    async fetchTrendingStatuses() {
        const toots = await this.fetchTrending(enums_1.TrendingType.STATUSES);
        return toots.map((t, i) => {
            const toot = toot_1.default.build(t);
            toot.sources = [enums_1.FediverseCacheKey.TRENDING_TOOTS];
            // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
            // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
            toot.trendingRank = 1 + (toots.length || 0) - i;
            return toot;
        });
    }
    /**
     * Get the tags that are trending on this server.
     * @returns {Promise<TagWithUsageCounts[]>} Array of trending tags with usage counts.
     */
    async fetchTrendingTags() {
        const numTags = config_1.config.trending.tags.numTagsPerServer;
        const trendingTags = await this.fetchTrending(enums_1.TrendingType.TAGS, numTags);
        return trendingTags.map(trending_with_history_1.decorateTagHistory);
    }
    ///////////////////////////////////
    //        Private Methods       //
    //////////////////////////////////
    /**
     * Get data from a public API endpoint on a Mastodon server.
     * @private
     * @param {string} endpoint - The API endpoint to fetch data from.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T>} The data fetched from the endpoint, with keys transformed to camelCase.
     */
    async fetch(endpoint, limit) {
        const url = this.endpointUrl(endpoint, limit);
        this.logger.deep(`Fetching "${url}"...`);
        const startedAt = new Date();
        const json = await axios_1.default.get(url, { timeout: config_1.config.api.timeoutMS });
        if (json.status === 200 && json.data) {
            this.logger.deep(`(${endpoint}) fetch response ${(0, time_helpers_1.ageString)(startedAt)}:`, json.data);
            return (0, collection_helpers_1.transformKeys)(json.data, change_case_1.camelCase);
        }
        else {
            throw json;
        }
    }
    /**
     * Fetch a list of objects of type T from a public API endpoint
     * @private
     * @param {string} endpoint - The API endpoint to fetch data from.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T[]>} Array of objects of type T.
     */
    async fetchList(endpoint, limit) {
        const label = endpoint.split("/").pop();
        const endpointURI = `'${this.domain}/${endpoint}`;
        const logger = this.logger.tempLogger(endpointURI);
        let list = [];
        try {
            list = await this.fetch(endpoint, limit);
            if (!list) {
                logger.logAndThrowError(`No ${label} found! list: ${JSON.stringify(list)}`);
            }
            else if (list.length === 0) {
                logger.warn(`Empty array of ${label} found (but no actual error)`);
            }
        }
        catch (err) {
            const msg = `Failed to scrape trending ${label} from ${this.domain}, skipping...`;
            api_1.default.instance.recordApiError(msg, err, logger);
            list = [];
        }
        return list;
    }
    /**
     * Generic trending data fetcher: Fetch a list of objects of type T from a public API endpoint
     * @private
     * @param {string} trendingType - The type of trending data to fetch (e.g., 'statuses', 'tags', 'links').
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {Promise<T[]>} Array of objects of type T.
     */
    async fetchTrending(trendingType, limit) {
        return this.fetchList(MastodonServer.trendUrl(trendingType), limit);
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Static Methods (mostly for calling instance methods on the top 30 or so servers in parallel) //
    //////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Get the top trending links from all servers in the fediverse.
     * @static
     * @returns {Promise<TrendingLink[]>} Array of trending links across all servers.
     */
    static async fediverseTrendingLinks() {
        return await this.getTrendingObjsFromAllServers({
            key: enums_1.FediverseCacheKey.TRENDING_LINKS,
            serverFxn: (server) => server.fetchTrendingLinks(),
            processingFxn: async (links) => {
                return (0, trending_with_history_1.uniquifyTrendingObjs)(links, link => link.url);
            }
        });
    }
    /**
     * Get the top trending tags from all servers, minus any invalid or muted tags.
     * @static
     * @returns {Promise<TagList>} TagList of trending tags across all servers.
     */
    static async fediverseTrendingTags() {
        const tags = await this.getTrendingObjsFromAllServers({
            key: enums_1.FediverseCacheKey.TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                const trendingTagList = new tag_list_1.default(tags, enums_1.TagTootsCategory.TRENDING);
                await trendingTagList.removeInvalidTrendingTags();
                return (0, trending_with_history_1.uniquifyTrendingObjs)(trendingTagList.objs, t => t.name);
            }
        });
        return new tag_list_1.default(tags, enums_1.TagTootsCategory.TRENDING);
    }
    /**
     * Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
     * @static
     * @returns {Promise<Toot[]>} Array of trending Toots across all servers.
     */
    static async fediverseTrendingToots() {
        const cacheKey = enums_1.FediverseCacheKey.TRENDING_TOOTS;
        return await this.getTrendingObjsFromAllServers({
            key: cacheKey,
            serverFxn: (server) => server.fetchTrendingStatuses(),
            processingFxn: async (toots) => {
                (0, trending_with_history_1.setTrendingRankToAvg)(toots);
                const trendingToots = await toot_1.default.buildToots(toots, cacheKey);
                return trendingToots.sort((a, b) => (b.trendingRank || 0) - (a.trendingRank || 0));
            }
        });
    }
    /**
     * Get the server names that are most relevant to the user (appears in follows a lot, mostly).
     * @static
     * @returns {Promise<MastodonInstances>} Dictionary of MastodonInstances keyed by domain.
     */
    static async getMastodonInstances() {
        const cacheKey = enums_1.FediverseCacheKey.POPULAR_SERVERS;
        const releaseMutex = await (0, mutex_helpers_1.lockExecution)(mutexes[cacheKey], getLogger(cacheKey, "getMastodonInstances"));
        try {
            let servers = await Storage_1.default.getIfNotStale(cacheKey);
            if (!servers) {
                servers = await this.fetchMastodonInstances();
                await Storage_1.default.set(cacheKey, servers);
            }
            return servers;
        }
        finally {
            releaseMutex();
        }
    }
    /**
     * Collect all three kinds of trending data (links, tags, toots) in one call.
     * @static
     * @returns {Promise<TrendingData>} Object containing trending links, tags, toots, and servers.
     */
    static async getTrendingData() {
        // TODO: would this be parallelized even without Promise.all?
        const [links, tags, toots, servers] = await Promise.all([
            this.fediverseTrendingLinks(),
            this.fediverseTrendingTags(),
            this.fediverseTrendingToots(),
            this.getMastodonInstances(),
        ]);
        return { links, servers, tags, toots };
    }
    ///////////////////////////////////////
    //      Private Static Methods       //
    ///////////////////////////////////////
    /**
     * Returns a dict of servers with MAU over the `minServerMAU` threshold
     * and the ratio of the number of users followed on a server to the MAU of that server.
     * @private
     * @static
     * @returns {Promise<MastodonInstances>} Dictionary of MastodonInstances keyed by domain.
     */
    static async fetchMastodonInstances() {
        const logger = getLogger(enums_1.FediverseCacheKey.POPULAR_SERVERS, "fetchMastodonInstances");
        logger.trace(`Fetching ${enums_1.FediverseCacheKey.POPULAR_SERVERS} info...`);
        const startedAt = new Date();
        // Find the servers which have the most accounts followed by the user to check for trends of interest
        const follows = await api_1.default.instance.getFollowedAccounts(); // TODO: this is a major bottleneck
        const followedUserDomainCounts = (0, collection_helpers_1.countValues)(follows, account => account.homeserver);
        logger.logSortedDict("followedUserDomainCounts", followedUserDomainCounts);
        let mostFollowedDomains = (0, collection_helpers_1.sortKeysByValue)(followedUserDomainCounts);
        mostFollowedDomains = mostFollowedDomains.filter(domain => !MastodonServer.isNoMauServer(domain));
        mostFollowedDomains = mostFollowedDomains.slice(0, config_1.config.fediverse.numServersToCheck);
        // Fetch Instance objects for the the Mastodon servers that have a lot of accounts followed by the
        // current Fedialgo. Filter out those below the userminServerMAU threshold
        let serverDict = await this.callForServers(mostFollowedDomains, (s) => s.fetchServerInfo());
        serverDict = filterMinMAU(serverDict, config_1.config.fediverse.minServerMAU);
        const numActiveServers = Object.keys(serverDict).length;
        const numServersToAdd = config_1.config.fediverse.numServersToCheck - numActiveServers; // Number of default servers to add
        // If we have haven't found enough servers yet add some known popular servers from the preconfigured list.
        // TODO: if some of the default servers barf we won't top up the list again
        if (numServersToAdd > 0) {
            logger.log(`Only ${numActiveServers} servers w/min ${config_1.config.fediverse.minServerMAU} MAU, adding some`);
            let extraDomains = [];
            if (config_1.config.locale.language != config_1.config.locale.defaultLanguage) {
                extraDomains = extraDomains.concat(config_1.config.fediverse.foreignLanguageServers[config_1.config.locale.language] || []);
                logger.log(`Using ${extraDomains.length} custom "${config_1.config.locale.language}" servers`);
            }
            extraDomains = extraDomains.concat((0, collection_helpers_1.shuffle)(config_1.config.fediverse.defaultServers));
            extraDomains = extraDomains.filter(s => !(s in serverDict)).slice(0, numServersToAdd);
            logger.log(`Adding ${extraDomains.length} default servers:`, extraDomains);
            const extraServerInfos = await this.callForServers(extraDomains, (s) => s.fetchServerInfo());
            serverDict = { ...serverDict, ...extraServerInfos };
        }
        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        // Filter out any null responses.
        const servers = Object.entries(serverDict).filter(([_k, v]) => !!v).reduce((serverDict, [domain, _instance]) => {
            const instance = _instance;
            const domainAccountsFollowed = followedUserDomainCounts[domain] || 0;
            instance.MAU = _instance?.usage?.users?.activeMonth || 0; // copy MAU to top level
            instance.followedPctOfMAU = instance.MAU ? (domainAccountsFollowed / instance.MAU) : 0;
            instance.followedPctOfMAU *= 100;
            serverDict[domain] = instance;
            return serverDict;
        }, {});
        const numServers = Object.keys(servers).length;
        logger.log(`Fetched ${numServers} Instances ${(0, time_helpers_1.ageString)(startedAt)}:`, servers);
        return servers;
    }
    /**
     * Generic wrapper to fetch trending data from all servers and process it into an array of unique objects
     * @private
     * @static
     * @param {FetchTrendingProps<T>} props - Properties for fetching and processing trending data.
     * @returns {Promise<T[]>} Array of unique objects of type T.
     */
    static async getTrendingObjsFromAllServers(props) {
        const { key, processingFxn, serverFxn } = props;
        const logger = getLogger(key, "fetchTrendingObjsFromAllServers");
        const releaseMutex = await (0, mutex_helpers_1.lockExecution)(mutexes[key], logger);
        const startedAt = new Date();
        try {
            let objs = await Storage_1.default.getIfNotStale(key);
            if (!objs?.length) {
                const serverObjs = await this.callForTopServers(serverFxn);
                objs = await processingFxn(Object.values(serverObjs).flat());
                logger.debugWithTraceObjs(`fetched ${objs.length} objs ${(0, time_helpers_1.ageString)(startedAt)}`, objs);
                await Storage_1.default.set(key, objs);
            }
            return objs;
        }
        finally {
            releaseMutex();
        }
    }
    /**
     * Get the server names that are most relevant to the user (appears in follows a lot, mostly)
     * @private
     * @static
     * @returns {Promise<string[]>} Array of top server domains.
     */
    static async getTopServerDomains() {
        const logger = getLogger(enums_1.FediverseCacheKey.POPULAR_SERVERS, "getTopServerDomains");
        const servers = await this.getMastodonInstances();
        // Sort the servers by the % of MAU followed by the fedialgo user
        const topServerDomains = Object.keys(servers).sort((a, b) => servers[b].followedPctOfMAU - servers[a].followedPctOfMAU);
        logger.debug(`Top server domains:`, topServerDomains);
        return topServerDomains;
    }
    /**
     * Call 'fxn' for a list of domains and return a dict keyed by domain.
     * @private
     * @static
     * @template T - The type of the result returned by the function.
     * @param {string[]} domains - Array of server domains to call the function on.
     * @param {(server: MastodonServer) => Promise<T>} fxn - The function to call for each server.
     * @returns {Promise<Record<string, T>>} A promise that resolves to a dictionary with domains as keys and results of type T as values.
     */
    static async callForServers(domains, fxn) {
        return await (0, collection_helpers_1.zipPromiseCalls)(domains, async (domain) => fxn(new MastodonServer(domain)), buildLogger());
    }
    /**
     * Call 'fxn' for all the top servers and return a dict keyed by server domain.
     * @private
     * @static
     * @template T - The type of the result returned by the function.
     * @param {(server: MastodonServer) => Promise<T>} fxn - The function to call for each server.
     * @returns {Promise<Record<string, T>>} A promise that resolves to a dictionary with domains as keys and results of type T as values.
     */
    static async callForTopServers(fxn) {
        const domains = await this.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    }
    /**
     * Build the full URL for a given API endpoint on this server, optionally adding a limit parameter.
     * @private
     * @param {string} endpoint - The API endpoint to build the URL for.
     * @param {number} [limit] - Optional limit on the number of items to fetch.
     * @returns {string} The full URL for the API endpoint.
     */
    endpointUrl(endpoint, limit) {
        return `https://${this.domain}/${endpoint}${(0, string_helpers_1.optionalSuffix)(limit, `?limit=${limit}`, true)}`;
    }
    /**
     * Returns true if the domain is known to not provide MAU and trending data via public API
     * @private
     * @static
     * @param {string} domain - The domain to check.
     * @returns {boolean} True if the domain is in the `noMauServers` list, false otherwise.
     */
    static isNoMauServer(domain) {
        return config_1.config.fediverse.noMauServers.includes(domain);
    }
    /** Build a URL for a trending type (tags, links, toots). */
    static trendUrl = (path) => this.v1Url(`trends/${path}`);
    /** Build a v1 API URL. */
    static v1Url = (path) => `${API_V1}/${path}`;
    /** Build a v2 API URL. */
    static v2Url = (path) => `${API_V2}/${path}`;
}
exports.default = MastodonServer;
;
// Return a dict of servers with MAU over the minServerMAU threshold
function filterMinMAU(serverInfos, minMAU) {
    const logger = getLogger(enums_1.FediverseCacheKey.POPULAR_SERVERS, "filterMinMAU");
    const servers = Object.entries(serverInfos).reduce((filtered, [domain, instanceObj]) => {
        if ((instanceObj?.usage?.users?.activeMonth || 0) >= minMAU) {
            filtered[domain] = instanceObj;
        }
        return filtered;
    }, {});
    logger.trace(`${Object.keys(servers).length} servers with MAU >= ${minMAU}:`, servers);
    return servers;
}
;
//# sourceMappingURL=mastodon_server.js.map