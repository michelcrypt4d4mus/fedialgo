"use strict";
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
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const time_helpers_1 = require("../helpers/time_helpers");
const trending_with_history_1 = require("./objects/trending_with_history");
const api_1 = require("./api");
const string_helpers_1 = require("../helpers/string_helpers");
const tag_1 = require("./objects/tag");
const collection_helpers_1 = require("../helpers/collection_helpers");
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
    // Static helper methods for building URLs
    static v1Url = (path) => `${API_V1}/${path}`;
    static v2Url = (path) => `${API_V2}/${path}`;
    static trendUrl = (path) => this.v1Url(`trends/${path}`);
    constructor(domain) {
        this.domain = domain;
    }
    ;
    // Fetch the mastodon.v2.Instance object (MAU, version, languages, rules, etc) for this server
    async fetchServerInfo() {
        if (Storage_1.default.getConfig().noMauServers.some(s => this.domain.startsWith(s))) {
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
    async fetchTrendingToots() {
        const toots = await this.fetchTrending(api_1.STATUSES);
        const trendingToots = toots.map(t => new toot_1.default(t)).filter(t => t.popularity() > 0);
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
    ;
    // Get the tags that are trending on 'server'
    async fetchTrendingTags() {
        const numTags = Storage_1.default.getConfig().numTrendingTagsPerServer;
        const trendingTags = await this.fetchTrending(api_1.TAGS, numTags);
        trendingTags.forEach(tag => (0, trending_with_history_1.decorateHistoryScores)((0, tag_1.repairTag)(tag)));
        return trendingTags;
    }
    ;
    // Fetch a list of objects of type T from a public API endpoint
    async fetchTrending(typeStr, limit) {
        return this.fetchList(MastodonServer.trendUrl(typeStr), limit);
    }
    ;
    // Fetch a list of objects of type T from a public API endpoint
    async fetchList(endpoint, limit) {
        const label = endpoint.split("/").pop();
        const endpointURI = `'${this.domain}/${endpoint}`;
        let list = [];
        try {
            list = await this.fetch(endpoint, limit);
            if (!list) {
                (0, string_helpers_1.logAndThrowError)(`No ${label} found! list: ${JSON.stringify(list)}`);
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
    ;
    // Get data from a public API endpoint on a Mastodon server.
    async fetch(endpoint, limit) {
        const startTime = new Date();
        let urlEndpoint = `${this.domain}/${endpoint}`;
        let url = `https://${urlEndpoint}`;
        if (limit)
            url += `?limit=${limit}`;
        // console.debug(`[${urlEndpoint}] fetching at ${quotedISOFmt(startTime)}...`);
        const json = await axios_1.default.get(url, { timeout: Storage_1.default.getConfig().timeoutMS });
        if (json.status === 200 && json.data) {
            // TODO: this is useful sometimes but incredibly verbose
            // console.debug(`[${urlEndpoint}] fetch response (${ageInSeconds(startTime)} seconds):`, json.data);
            return (0, collection_helpers_1.transformKeys)(json.data, change_case_1.camelCase);
        }
        else {
            throw json;
        }
    }
    ;
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Static Methods (mostly for calling instance methods on the top 30 or so servers in parallel) //
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Collect all three kinds of trending data (links, tags, toots) in one call
    static async getTrendingData() {
        const responses = await Promise.all([
            this.fediverseTrendingLinks(),
            this.fediverseTrendingTags(),
            this.fediverseTrendingToots(),
        ]);
        return {
            links: responses[0],
            tags: responses[1],
            toots: responses[2],
        };
    }
    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots() {
        return await this.fetchTrendingFromAllServers({
            key: types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS,
            loadingFxn: Storage_1.default.getToots.bind(Storage_1.default),
            serverFxn: (server) => server.fetchTrendingToots(),
            processingFxn: async (toots) => {
                (0, trending_with_history_1.setTrendingRankToAvg)(toots);
                await toot_1.default.setDependentProps(toots);
                let uniqueToots = toot_1.default.dedupeToots(toots, types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS);
                uniqueToots = uniqueToots.sort((a, b) => b.popularity() - a.popularity());
                Storage_1.default.storeToots(types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS, uniqueToots);
                return uniqueToots;
            },
        });
    }
    ;
    // Get the top trending links from all servers
    static async fediverseTrendingLinks() {
        return await this.fetchTrendingFromAllServers({
            key: types_1.StorageKey.FEDIVERSE_TRENDING_LINKS,
            serverFxn: (server) => server.fetchTrendingLinks(),
            processingFxn: async (links) => {
                const uniqueLinks = (0, trending_with_history_1.uniquifyTrendingObjs)(links, obj => obj.url);
                await Storage_1.default.set(types_1.StorageKey.FEDIVERSE_TRENDING_LINKS, uniqueLinks);
                return uniqueLinks;
            }
        });
    }
    ;
    // Get the top trending tags from all servers
    static async fediverseTrendingTags() {
        return await this.fetchTrendingFromAllServers({
            key: types_1.StorageKey.FEDIVERSE_TRENDING_TAGS,
            serverFxn: (server) => server.fetchTrendingTags(),
            processingFxn: async (tags) => {
                let uniqueTags = (0, trending_with_history_1.uniquifyTrendingObjs)(tags, obj => obj.name);
                uniqueTags = uniqueTags.slice(0, Storage_1.default.getConfig().numTrendingTags);
                await Storage_1.default.set(types_1.StorageKey.FEDIVERSE_TRENDING_TAGS, uniqueTags);
                return uniqueTags;
            }
        });
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getMastodonServersInfo() {
        const releaseMutex = await TRENDING_MUTEXES[types_1.StorageKey.POPULAR_SERVERS].acquire();
        const logPrefix = `[${types_1.StorageKey.POPULAR_SERVERS}]`;
        try {
            let servers = await Storage_1.default.get(types_1.StorageKey.POPULAR_SERVERS);
            // TODO: we should store the whole Instance object not just the MAU computation etc
            if (servers && Object.keys(servers).length && !(await Storage_1.default.isDataStale(types_1.StorageKey.POPULAR_SERVERS))) {
                console.debug(`${logPrefix} Loaded ${Object.keys(servers).length} from cache...`);
            }
            else {
                servers = await this.fetchMastodonServersInfo();
                console.log(`${logPrefix} retrieved mastodon server infos`, servers);
                await Storage_1.default.set(types_1.StorageKey.POPULAR_SERVERS, servers);
            }
            return servers;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    static async fetchMastodonServersInfo() {
        const logPrefix = `[${types_1.StorageKey.POPULAR_SERVERS}] fetchMastodonServersInfo():`;
        console.debug(`${logPrefix} fetching ${types_1.StorageKey.POPULAR_SERVERS} info...`);
        const config = Storage_1.default.getConfig();
        const startTime = new Date();
        const follows = await api_1.MastoApi.instance.getFollowedAccounts(); // TODO: this is a major bottleneck
        // Find the top numServersToCheck servers among accounts followed by the user to check for trends.
        const followedServerUserCounts = (0, collection_helpers_1.countValues)(follows, account => account.homeserver());
        const mostFollowedServers = (0, collection_helpers_1.sortKeysByValue)(followedServerUserCounts).slice(0, config.numServersToCheck);
        // Fetch Instance objects for the most followed servers
        let serverInfos = await this.callForServers(mostFollowedServers, (s) => s.fetchServerInfo());
        let serverMAUs = instancesToServerMAUs(serverInfos);
        const validServers = (0, collection_helpers_1.atLeastValues)(serverMAUs, config.minServerMAU);
        const numValidServers = Object.keys(validServers).length;
        const numDefaultServers = config.numServersToCheck - numValidServers;
        console.debug(`${logPrefix} followedServerUserCounts:`, followedServerUserCounts, `\nserverMAUs:`, serverMAUs);
        if (numDefaultServers > 0) {
            console.warn(`${logPrefix} Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} user threshold`);
            const extraServers = config.defaultServers.filter(s => !(s in serverMAUs)).slice(0, numDefaultServers);
            const extraServerInfos = await this.callForServers(extraServers, (s) => s.fetchServerInfo());
            const extraServerMAUs = instancesToServerMAUs(extraServerInfos);
            const allServerInfos = { ...serverInfos, ...extraServerInfos };
            console.log(`${logPrefix} mastodon.v2.Instance objs for all servers:`, allServerInfos);
            serverMAUs = { ...validServers, ...extraServerMAUs };
        }
        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        const mastodonServers = Object.keys(serverMAUs).reduce((serverInfo, server) => {
            serverInfo[server] = {
                domain: server,
                followedPctOfMAU: 100 * (followedServerUserCounts[server] || 0) / serverMAUs[server],
                serverMAU: serverMAUs[server],
            };
            return serverInfo;
        }, {});
        console.log(`${logPrefix} Constructed MastodonServersInfo object ${(0, time_helpers_1.inSeconds)(startTime)}:`, mastodonServers);
        return mastodonServers;
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getTopServerDomains() {
        const servers = await this.getMastodonServersInfo();
        // Sort the servers by the number of users on each server
        const topServerDomains = Object.keys(servers).sort((a, b) => servers[b].followedPctOfMAU - servers[a].followedPctOfMAU);
        console.debug(`[${types_1.StorageKey.POPULAR_SERVERS}] Top server domains:`, topServerDomains);
        return topServerDomains;
    }
    ;
    // Generic wrapper method to fetch trending data from all servers and process it into
    // an array of unique objects.
    static async fetchTrendingFromAllServers(props) {
        const { key, processingFxn, serverFxn } = props;
        const loadingFxn = props.loadingFxn || Storage_1.default.get.bind(Storage_1.default);
        const releaseMutex = await TRENDING_MUTEXES[key].acquire();
        const startTime = new Date();
        const logPrefix = `[${key}]`;
        try {
            const storageObjs = await loadingFxn(key);
            if (storageObjs?.length && !(await Storage_1.default.isDataStale(key))) {
                console.debug(`${logPrefix} Loaded ${storageObjs.length} cached records ${(0, time_helpers_1.inSeconds)(startTime)}`);
                return storageObjs;
            }
            else {
                const serverObjs = await this.callForAllServers(serverFxn);
                // console.debug(`${logPrefix} result from all servers:`, serverObjs);
                const flatObjs = Object.values(serverObjs).flat();
                const uniqueObjs = await processingFxn(flatObjs);
                let msg = `[${string_helpers_1.TELEMETRY}] fetched ${uniqueObjs.length} unique records ${(0, time_helpers_1.inSeconds)(startTime)}`;
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
const instancesToServerMAUs = (instances) => {
    return Object.entries(instances).reduce((maus, [server, instance]) => {
        maus[server] = instance?.usage?.users?.activeMonth || 0;
        return maus;
    }, {});
};
//# sourceMappingURL=mastodon_server.js.map