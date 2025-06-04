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
const enums_1 = require("../enums");
const config_1 = require("../config");
const log_helpers_1 = require("../helpers/log_helpers");
const logger_1 = require("../helpers/logger");
const enums_2 = require("../enums");
const collection_helpers_1 = require("../helpers/collection_helpers");
const trending_with_history_1 = require("./objects/trending_with_history");
const TRENDING_MUTEXES = config_1.FEDIVERSE_CACHE_KEYS.reduce((mutexes, key) => {
    mutexes[key] = new async_mutex_1.Mutex();
    return mutexes;
}, {});
const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const INSTANCE = "instance";
const LOG_PREFIX = `MastodonServer`;
const getLogger = logger_1.Logger.logBuilder(LOG_PREFIX);
;
class MastodonServer {
    domain;
    logger;
    // Helper methods for building URLs
    static v1Url = (path) => `${API_V1}/${path}`;
    static v2Url = (path) => `${API_V2}/${path}`;
    static trendUrl = (path) => this.v1Url(`trends/${path}`);
    constructor(domain) {
        this.domain = domain;
        this.logger = logger_1.Logger.withParenthesizedName(LOG_PREFIX, domain);
    }
    ;
    // Fetch the mastodon.v2.Instance object (MAU, version, languages, rules, etc) for this server
    async fetchServerInfo() {
        const logPrefix = `(fetchServerInfo())`;
        if (MastodonServer.isNoMauServer(this.domain)) {
            this.logger.debug(`${logPrefix} Instance info for '${this.domain}' is not available...`);
            return null;
        }
        try {
            return await this.fetch(MastodonServer.v2Url(INSTANCE));
        }
        catch (error) {
            this.logger.warn(`${logPrefix} Error for server '${this.domain}'`, error);
            return null;
        }
    }
    // Fetch toots that are trending on this server
    // TODO: Important: Toots returned by this method have not had setDependentProps() called on them yet!
    // Should return SerializableToot objects but that's annoying to make work w/the typesystem.
    async fetchTrendingStatuses() {
        const toots = await this.fetchTrending(enums_2.TrendingType.STATUSES);
        const trendingToots = toots.map(t => toot_1.default.build(t));
        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => {
            toot.trendingRank = 1 + (trendingToots?.length || 0) - i;
            toot.sources = [enums_1.CacheKey.FEDIVERSE_TRENDING_TOOTS];
        });
        return trendingToots;
    }
    // Get the links that are trending on this server
    async fetchTrendingLinks() {
        if (config_1.config.fediverse.noTrendingLinksServers.includes(this.domain)) {
            this.logger.debug(`Trending links are not available for '${this.domain}', skipping...`);
            return [];
        }
        const numLinks = config_1.config.trending.links.numTrendingLinksPerServer;
        const trendingLinks = await this.fetchTrending(enums_2.TrendingType.LINKS, numLinks);
        trendingLinks.forEach(trending_with_history_1.decorateLinkHistory);
        return trendingLinks;
    }
    // Get the tags that are trending on 'server'
    async fetchTrendingTags() {
        const numTags = config_1.config.trending.tags.numTagsPerServer;
        let trendingTags = await this.fetchTrending(enums_2.TrendingType.TAGS, numTags);
        trendingTags.forEach(tag => (0, trending_with_history_1.decorateTagHistory)(tag));
        return trendingTags;
    }
    ///////////////////////////////////
    //        Private Methods       //
    //////////////////////////////////
    // Get data from a public API endpoint on a Mastodon server.
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
    // Fetch a list of objects of type T from a public API endpoint
    async fetchList(endpoint, limit) {
        const label = endpoint.split("/").pop();
        const endpointURI = `'${this.domain}/${endpoint}`;
        const logPrefix = `(${endpointURI})`;
        let list = [];
        try {
            list = await this.fetch(endpoint, limit);
            if (!list) {
                getLogger(endpoint).logAndThrowError(`No ${label} found! list: ${JSON.stringify(list)}`);
            }
            else if (list.length === 0) {
                this.logger.warn(`${logPrefix} Empty array of ${label} found (but no actual error)`);
            }
        }
        catch (e) {
            this.logger.warn(`${logPrefix} Failed to get ${label} data! Error:`, e);
            list = [];
        }
        return list;
    }
    // Generic trending data fetcher: Fetch a list of objects of type T from a public API endpoint
    async fetchTrending(typeStr, limit) {
        return this.fetchList(MastodonServer.trendUrl(typeStr), limit);
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Static Methods (mostly for calling instance methods on the top 30 or so servers in parallel) //
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Get the top trending links from all servers
    static async fediverseTrendingLinks() {
        return await this.fetchTrendingObjsFromAllServers({
            key: enums_1.CacheKey.FEDIVERSE_TRENDING_LINKS,
            serverFxn: (server) => server.fetchTrendingLinks(),
            processingFxn: async (links) => {
                return (0, trending_with_history_1.uniquifyTrendingObjs)(links, link => link.url);
            }
        });
    }
    // Get the top trending tags from all servers, minus any invalid or muted tags
    static async fediverseTrendingTags() {
        const tags = await this.fetchTrendingObjsFromAllServers({
            key: enums_1.CacheKey.FEDIVERSE_TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                const trendingTagList = new tag_list_1.default(tags, enums_1.TagTootsCacheKey.TRENDING_TAG_TOOTS);
                trendingTagList.removeInvalidTrendingTags();
                await trendingTagList.removeMutedTags();
                return (0, trending_with_history_1.uniquifyTrendingObjs)(trendingTagList.objs, t => t.name);
            }
        });
        return new tag_list_1.default(tags, enums_1.TagTootsCacheKey.TRENDING_TAG_TOOTS);
    }
    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots() {
        return await this.fetchTrendingObjsFromAllServers({
            key: enums_1.CacheKey.FEDIVERSE_TRENDING_TOOTS,
            serverFxn: (server) => server.fetchTrendingStatuses(),
            processingFxn: async (toots) => {
                (0, trending_with_history_1.setTrendingRankToAvg)(toots);
                const trendingToots = await toot_1.default.buildToots(toots, enums_1.CacheKey.FEDIVERSE_TRENDING_TOOTS);
                return trendingToots.sort((a, b) => (b.trendingRank || 0) - (a.trendingRank || 0));
            }
        });
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getMastodonInstancesInfo() {
        const logger = getLogger(enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS, "getMastodonInstancesInfo");
        const releaseMutex = await (0, log_helpers_1.lockExecution)(TRENDING_MUTEXES[enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS], logger);
        try {
            let servers = await Storage_1.default.getIfNotStale(enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS);
            if (!servers) {
                servers = await this.fetchMastodonInstances();
                await Storage_1.default.set(enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS, servers);
            }
            return servers;
        }
        finally {
            releaseMutex();
        }
    }
    // Collect all three kinds of trending data (links, tags, toots) in one call
    static async getTrendingData() {
        // TODO: would this be parallelized even without Promise.all?
        const [links, tags, servers, toots] = await Promise.all([
            this.fediverseTrendingLinks(),
            tag_list_1.default.fromTrending(),
            this.getMastodonInstancesInfo(),
            this.fediverseTrendingToots(),
        ]);
        return { links, servers, tags, toots };
    }
    ///////////////////////////////////////
    //      Private Static Methods       //
    ///////////////////////////////////////
    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    static async fetchMastodonInstances() {
        const logger = getLogger(enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS, "fetchMastodonInstances");
        logger.trace(`Fetching ${enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS} info...`);
        const startedAt = new Date();
        // Find the servers which have the most accounts followed by the user to check for trends of interest
        const follows = await api_1.default.instance.getFollowedAccounts(); // TODO: this is a major bottleneck
        const followedUserDomainCounts = (0, collection_helpers_1.countValues)(follows, account => account.homeserver());
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
    // Generic wrapper to fetch trending data from all servers and process it into an array of unique objects
    static async fetchTrendingObjsFromAllServers(props) {
        const { key, processingFxn, serverFxn } = props;
        const logger = getLogger(key, "fetchTrendingObjsFromAllServers");
        const releaseMutex = await (0, log_helpers_1.lockExecution)(TRENDING_MUTEXES[key], logger);
        const startedAt = new Date();
        try {
            let records = await Storage_1.default.getIfNotStale(key);
            if (!records?.length) {
                const serverObjs = await this.callForTopServers(serverFxn);
                // logger.trace(`result from all servers:`, serverObjs);
                const flatObjs = Object.values(serverObjs).flat();
                records = await processingFxn(flatObjs);
                logger.debug(`fetched ${records.length} unique records ${(0, time_helpers_1.ageString)(startedAt)}`, records);
                await Storage_1.default.set(key, records);
            }
            return records;
        }
        finally {
            releaseMutex();
        }
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getTopServerDomains() {
        const servers = await this.getMastodonInstancesInfo();
        const logger = getLogger(enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS, "getTopServerDomains");
        // Sort the servers by the % of MAU followed by the fedialgo user
        const topServerDomains = Object.keys(servers).sort((a, b) => servers[b].followedPctOfMAU - servers[a].followedPctOfMAU);
        logger.debug(`Top server domains:`, topServerDomains);
        return topServerDomains;
    }
    // Call 'fxn' for a list of domains and return a dict keyed by domain
    static async callForServers(domains, fxn) {
        return await (0, collection_helpers_1.zipPromises)(domains, async (domain) => fxn(new MastodonServer(domain)));
    }
    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    static async callForTopServers(fxn) {
        const domains = await this.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    }
    endpointUrl(endpoint, limit) {
        return `https://${this.domain}/${endpoint}` + (limit ? `?limit=${limit}` : '');
    }
    // Returns true if the domain is known to not provide MAU and trending data via public API
    static isNoMauServer(domain) {
        return config_1.config.fediverse.noMauServers.some(s => domain == s);
    }
}
exports.default = MastodonServer;
;
// Return a dict of servers with MAU over the minServerMAU threshold
function filterMinMAU(serverInfos, minMAU) {
    const logger = getLogger(enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS, "filterMinMAU");
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