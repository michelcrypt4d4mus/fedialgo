"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FediverseTrendingType = void 0;
/*
 * Class for interacting with the public non-authenticated API of a Mastodon server.
 */
const axios_1 = __importDefault(require("axios"));
const change_case_1 = require("change-case");
const async_mutex_1 = require("async-mutex");
const api_1 = __importStar(require("./api"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const collection_helpers_1 = require("../helpers/collection_helpers");
const trending_with_history_1 = require("./objects/trending_with_history");
const time_helpers_1 = require("../helpers/time_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const tag_1 = require("./objects/tag");
const string_helpers_1 = require("../helpers/string_helpers");
const collection_helpers_2 = require("../helpers/collection_helpers");
const types_1 = require("../types");
var FediverseTrendingType;
(function (FediverseTrendingType) {
    FediverseTrendingType["STATUSES"] = "statuses";
    FediverseTrendingType["LINKS"] = "links";
    FediverseTrendingType["TAGS"] = "tags";
})(FediverseTrendingType || (exports.FediverseTrendingType = FediverseTrendingType = {}));
;
const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const TRENDING_MUTEXES = {
    [types_1.StorageKey.FEDIVERSE_TRENDING_LINKS]: new async_mutex_1.Mutex(),
    [types_1.StorageKey.FEDIVERSE_TRENDING_TAGS]: new async_mutex_1.Mutex(),
    [types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS]: new async_mutex_1.Mutex(),
    [types_1.StorageKey.POPULAR_SERVERS]: new async_mutex_1.Mutex(),
};
;
class MastodonServer {
    domain;
    // Helper methods for building URLs
    static v1Url = (path) => `${API_V1}/${path}`;
    static v2Url = (path) => `${API_V2}/${path}`;
    static trendUrl = (path) => this.v1Url(`trends/${path}`);
    endpointDomain = (endpoint) => `${this.domain}/${endpoint}`;
    endpointUrl = (endpoint) => `https://${this.endpointDomain(endpoint)}`;
    constructor(domain) {
        this.domain = domain;
    }
    ;
    // Fetch the mastodon.v2.Instance object (MAU, version, languages, rules, etc) for this server
    async fetchServerInfo() {
        if (MastodonServer.isNoMauServer(this.domain)) {
            console.debug(`[fetchServerInfo()] Instance info for '${this.domain}' is not available...`);
            return null;
        }
        try {
            return await this.fetch(MastodonServer.v2Url(api_1.INSTANCE));
        }
        catch (error) {
            console.warn(`[fetchServerInfo()] Error for server '${this.domain}'`, error);
            return null;
        }
    }
    // Fetch toots that are trending on this server
    // TODO: Important: Toots returned by this method have not had setDependentProps() called on them yet!
    // Should return SerializableToot objects but that's annoying to make work w/the typesystem.
    async fetchTrendingStatuses() {
        const toots = await this.fetchTrending(api_1.STATUSES);
        const trendingToots = toots.map(t => new toot_1.default(t));
        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => {
            toot.trendingRank = 1 + (trendingToots?.length || 0) - i;
        });
        return trendingToots;
    }
    // Get the links that are trending on this server
    async fetchTrendingLinks() {
        if (Storage_1.default.getConfig().noTrendingLinksServers.includes(this.domain)) {
            console.debug(`Trending links are not available for '${this.domain}', skipping...`);
            return [];
        }
        const numLinks = Storage_1.default.getConfig().numTrendingLinksPerServer;
        const trendingLinks = await this.fetchTrending(api_1.LINKS, numLinks);
        trendingLinks.forEach(trending_with_history_1.decorateHistoryScores);
        return trendingLinks;
    }
    // Get the tags that are trending on 'server'
    async fetchTrendingTags() {
        const numTags = Storage_1.default.getConfig().numTrendingTagsPerServer;
        const trendingTags = await this.fetchTrending(api_1.TAGS, numTags);
        trendingTags.forEach(tag => (0, trending_with_history_1.decorateHistoryScores)((0, tag_1.repairTag)(tag)));
        return trendingTags;
    }
    ///////////////////////////////////
    //        Private Methods       //
    //////////////////////////////////
    // Generic trending data fetcher: Fetch a list of objects of type T from a public API endpoint
    async fetchTrending(typeStr, limit) {
        return this.fetchList(MastodonServer.trendUrl(typeStr), limit);
    }
    // Fetch a list of objects of type T from a public API endpoint
    async fetchList(endpoint, limit) {
        const label = endpoint.split("/").pop();
        const endpointURI = `'${this.domain}/${endpoint}`;
        let list = [];
        try {
            list = await this.fetch(endpoint, limit);
            if (!list) {
                (0, log_helpers_1.logAndThrowError)(`No ${label} found! list: ${JSON.stringify(list)}`);
            }
            else if (list.length === 0) {
                console.warn(`[${endpointURI}] Empty array of ${label} found (but no actual error)`);
            }
        }
        catch (e) {
            console.warn(`[${endpointURI}] Failed to get ${label} data! Error:`, e);
            list = [];
        }
        return list;
    }
    // Get data from a public API endpoint on a Mastodon server.
    async fetch(endpoint, limit) {
        let url = this.endpointUrl(endpoint);
        if (limit)
            url += `?limit=${limit}`;
        (0, log_helpers_1.traceLog)(`[${this.endpointDomain(endpoint)}] fetching...`);
        const startedAt = new Date();
        const json = await axios_1.default.get(url, { timeout: Storage_1.default.getConfig().timeoutMS });
        if (json.status === 200 && json.data) {
            (0, log_helpers_1.traceLog)(`[${this.endpointDomain(endpoint)}] fetch response ${(0, time_helpers_1.ageString)(startedAt)}:`, json.data);
            return (0, collection_helpers_1.transformKeys)(json.data, change_case_1.camelCase);
        }
        else {
            throw json;
        }
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Static Methods (mostly for calling instance methods on the top 30 or so servers in parallel) //
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Collect all three kinds of trending data (links, tags, toots) in one call
    static async getTrendingData() {
        const [links, tags, toots] = await Promise.all([
            this.fediverseTrendingLinks(),
            this.fediverseTrendingTags(),
            this.fediverseTrendingToots(),
        ]);
        return { links, tags, toots };
    }
    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots() {
        return await this.fetchTrendingFromAllServers({
            key: types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS,
            loadingFxn: Storage_1.default.getToots.bind(Storage_1.default),
            serverFxn: (server) => server.fetchTrendingStatuses(),
            processingFxn: async (toots) => {
                (0, trending_with_history_1.setTrendingRankToAvg)(toots);
                return await toot_1.default.buildToots(toots, types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS);
            },
        });
    }
    // Get the top trending links from all servers
    static async fediverseTrendingLinks() {
        return await this.fetchTrendingFromAllServers({
            key: types_1.StorageKey.FEDIVERSE_TRENDING_LINKS,
            serverFxn: (server) => server.fetchTrendingLinks(),
            processingFxn: async (links) => {
                return (0, trending_with_history_1.uniquifyTrendingObjs)(links, link => link.url);
            }
        });
    }
    // Get the top trending tags from all servers
    static async fediverseTrendingTags() {
        return await this.fetchTrendingFromAllServers({
            key: types_1.StorageKey.FEDIVERSE_TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                const uniqueTags = (0, trending_with_history_1.uniquifyTrendingObjs)(tags, tag => tag.name);
                return (0, collection_helpers_2.truncateToConfiguredLength)(uniqueTags, "numTrendingTags");
            }
        });
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getMastodonInstancesInfo() {
        const logPrefix = `[${types_1.StorageKey.POPULAR_SERVERS}]`;
        const startedAt = new Date();
        const releaseMutex = await (0, log_helpers_1.lockMutex)(TRENDING_MUTEXES[types_1.StorageKey.POPULAR_SERVERS], logPrefix);
        try {
            let servers = await Storage_1.default.get(types_1.StorageKey.POPULAR_SERVERS);
            if (servers && Object.keys(servers).length && !(await Storage_1.default.isDataStale(types_1.StorageKey.POPULAR_SERVERS))) {
                (0, log_helpers_1.traceLog)(`${logPrefix} Loaded ${Object.keys(servers).length} from cache ${(0, time_helpers_1.ageString)(startedAt)}`);
            }
            else {
                servers = await this.fetchMastodonInstances();
                console.log(`${logPrefix} Fetched ${Object.keys(servers).length} Instances ${(0, time_helpers_1.ageString)(startedAt)}:`, servers);
                await Storage_1.default.set(types_1.StorageKey.POPULAR_SERVERS, servers);
            }
            return servers;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Returns true if the domain is known to not provide MAU and trending data via public API
    static isNoMauServer(domain) {
        return Storage_1.default.getConfig().noMauServers.some(s => domain == s);
    }
    ///////////////////////////////////////
    //      Private Static Methods       //
    ///////////////////////////////////////
    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    static async fetchMastodonInstances() {
        const logPrefix = `[${types_1.StorageKey.POPULAR_SERVERS}] fetchMastodonServersInfo():`;
        (0, log_helpers_1.traceLog)(`${logPrefix} fetching ${types_1.StorageKey.POPULAR_SERVERS} info...`);
        const config = Storage_1.default.getConfig();
        // Find the servers which have the most accounts followed by the user to check for trends of interest
        const follows = await api_1.default.instance.getFollowedAccounts(); // TODO: this is a major bottleneck
        const followedUserDomainCounts = (0, collection_helpers_1.countValues)(follows, account => account.homeserver());
        let mostFollowedDomains = (0, collection_helpers_1.sortKeysByValue)(followedUserDomainCounts);
        mostFollowedDomains = mostFollowedDomains.filter(domain => !MastodonServer.isNoMauServer(domain));
        mostFollowedDomains = mostFollowedDomains.slice(0, config.numServersToCheck);
        // Fetch Instance objects for the the Mastodon servers that have a lot of accounts followed by the
        // current Fedialgo. Filter out those below the userminServerMAU threshold
        let serverDict = await this.callForServers(mostFollowedDomains, (s) => s.fetchServerInfo());
        serverDict = filterMinMAU(serverDict, config.minServerMAU);
        const numActiveServers = Object.keys(serverDict).length;
        const numServersToAdd = config.numServersToCheck - numActiveServers; // Number of default servers to add
        // If we have haven't found enough servers yet add some known popular servers from the preconfigured list.
        // TODO: if some of the default servers barf we won't top up the list again
        if (numServersToAdd > 0) {
            console.log(`${logPrefix} Only ${numActiveServers} servers w/min ${config.minServerMAU} MAU, adding some`);
            const extraServers = config.defaultServers.filter(s => !(s in serverDict)).slice(0, numServersToAdd);
            const extraServerInfos = await this.callForServers(extraServers, (s) => s.fetchServerInfo());
            serverDict = { ...serverDict, ...extraServerInfos };
        }
        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        return Object.entries(serverDict).reduce((serverDict, [domain, _instance]) => {
            // Replace any null responses with MastodonInstanceEmpty objs
            const instance = _instance ? _instance : {};
            const domainAccountsFollowed = followedUserDomainCounts[domain] || 0;
            instance.MAU = _instance?.usage?.users?.activeMonth || 0; // copy MAU to top level
            instance.followedPctOfMAU = instance.MAU ? (domainAccountsFollowed / instance.MAU) : 0;
            instance.followedPctOfMAU *= 100;
            serverDict[domain] = instance;
            return serverDict;
        }, {});
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getTopServerDomains() {
        const servers = await this.getMastodonInstancesInfo();
        // Sort the servers by the number of users on each server
        const topServerDomains = Object.keys(servers).sort((a, b) => servers[b].followedPctOfMAU - servers[a].followedPctOfMAU);
        console.debug(`[${types_1.StorageKey.POPULAR_SERVERS}] Top server domains:`, topServerDomains);
        return topServerDomains;
    }
    // Generic wrapper method to fetch trending data from all servers and process it into
    // an array of unique objects.
    static async fetchTrendingFromAllServers(props) {
        const { key, processingFxn, serverFxn } = props;
        const loadingFxn = props.loadingFxn || Storage_1.default.get.bind(Storage_1.default);
        const logPrefix = `[${key}]`;
        const releaseMutex = await (0, log_helpers_1.lockMutex)(TRENDING_MUTEXES[key], logPrefix);
        const startedAt = new Date();
        try {
            const storageObjs = await loadingFxn(key);
            if (storageObjs?.length && !(await Storage_1.default.isDataStale(key))) {
                (0, log_helpers_1.traceLog)(`${logPrefix} Loaded ${storageObjs.length} cached records ${(0, time_helpers_1.ageString)(startedAt)}`);
                return storageObjs;
            }
            else {
                const serverObjs = await this.callForAllServers(serverFxn);
                (0, log_helpers_1.traceLog)(`${logPrefix} result from all servers:`, serverObjs);
                const flatObjs = Object.values(serverObjs).flat();
                const uniqueObjs = await processingFxn(flatObjs);
                if (uniqueObjs.length && uniqueObjs[0] instanceof toot_1.default) {
                    await Storage_1.default.storeToots(key, uniqueObjs);
                }
                else {
                    await Storage_1.default.set(key, uniqueObjs);
                }
                let msg = `[${string_helpers_1.TELEMETRY}] fetched ${uniqueObjs.length} unique records ${(0, time_helpers_1.ageString)(startedAt)}`;
                console.log(`${logPrefix} ${msg}`, uniqueObjs);
                return uniqueObjs;
            }
        }
        finally {
            releaseMutex();
        }
    }
    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    static async callForAllServers(fxn) {
        const domains = await this.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    }
    // Call 'fxn' for a list of domains and return a dict keyed by domain
    static async callForServers(domains, fxn) {
        return await (0, collection_helpers_1.zipPromises)(domains, async (domain) => fxn(new MastodonServer(domain)));
    }
}
exports.default = MastodonServer;
;
// Return a dict of servers with MAU over the minServerMAU threshold
function filterMinMAU(serverInfos, minMAU) {
    const servers = Object.entries(serverInfos).reduce((filtered, [domain, instanceObj]) => {
        if ((instanceObj?.usage?.users?.activeMonth || 0) >= minMAU) {
            filtered[domain] = instanceObj;
        }
        return filtered;
    }, {});
    (0, log_helpers_1.traceLog)(`[filterMinMAU()] ${Object.keys(servers).length} servers with MAU >= ${minMAU}:`, servers);
    return servers;
}
;
//# sourceMappingURL=mastodon_server.js.map