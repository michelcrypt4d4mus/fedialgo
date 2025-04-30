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
const feature_scorer_1 = __importDefault(require("../scorer/feature_scorer"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const time_helpers_1 = require("../helpers/time_helpers");
const api_1 = require("./api");
const types_1 = require("../types");
const tag_1 = require("./objects/tag");
const collection_helpers_1 = require("../helpers/collection_helpers");
var FediverseTrendingType;
(function (FediverseTrendingType) {
    FediverseTrendingType["STATUSES"] = "statuses";
    FediverseTrendingType["LINKS"] = "links";
    FediverseTrendingType["TAGS"] = "tags";
})(FediverseTrendingType || (exports.FediverseTrendingType = FediverseTrendingType = {}));
;
const trendingMutexes = {
    [types_1.StorageKey.FEDIVERSE_TRENDING_LINKS]: new async_mutex_1.Mutex(),
    [types_1.StorageKey.FEDIVERSE_TRENDING_TAGS]: new async_mutex_1.Mutex(),
    [types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS]: new async_mutex_1.Mutex(),
};
class MastodonServer {
    domain;
    constructor(domain) {
        this.domain = domain;
    }
    ;
    // Fetch toots that are trending on this server
    async fetchTrendingToots() {
        const toots = await this.fetchTrending(api_1.STATUSES);
        const trendingToots = toots.map(t => new toot_1.default(t)).filter(t => t.popularity() > 0);
        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => {
            toot.trendingRank = 1 + (trendingToots?.length || 0) - i;
            if (toot.reblog)
                toot.trendingRank = toot.trendingRank;
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
        trendingLinks.forEach(feature_scorer_1.default.decorateHistoryScores);
        return trendingLinks;
    }
    ;
    // Get the tags that are trending on 'server'
    async fetchTrendingTags() {
        const numTags = Storage_1.default.getConfig().numTrendingTagsPerServer;
        const trendingTags = await this.fetchTrending(api_1.TAGS, numTags);
        trendingTags.forEach(tag => feature_scorer_1.default.decorateHistoryScores((0, tag_1.repairTag)(tag)));
        return trendingTags;
    }
    ;
    // Get publicly available MAU information for this server.
    async fetchMonthlyUsers() {
        if (Storage_1.default.getConfig().noMauServers.some(s => this.domain.startsWith(s))) {
            console.debug(`monthlyUsers() for '${this.domain}' is not available...`);
            return 0;
        }
        try {
            const instance = await this.fetch(api_1.MastoApi.v2Url(api_1.INSTANCE));
            return instance?.usage?.users?.activeMonth || 0;
        }
        catch (error) {
            console.warn(`Error in getMonthlyUsers() for server ${this.domain}`, error);
            return 0;
        }
    }
    ;
    // Fetch a list of objects of type T from a public API endpoint
    async fetchTrending(typeStr, limit) {
        return this.fetchList(api_1.MastoApi.trendUrl(typeStr), limit);
    }
    ;
    // Fetch a list of objects of type T from a public API endpoint
    async fetchList(endpoint, limit) {
        const label = endpoint.split("/").pop();
        let list = [];
        try {
            list = await this.fetch(endpoint, limit);
            if (!list?.length) {
                throw new Error(`No ${label} found! list: ${JSON.stringify(list)}`);
            }
        }
        catch (e) {
            console.warn(`[fetchList] Failed to get data from '${this.domain}/${endpoint}! Response:`, e);
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
        console.debug(`[${urlEndpoint}] fetching at ${startTime}...`);
        const json = await axios_1.default.get(url, { timeout: Storage_1.default.getConfig().timeoutMS });
        if (json.status === 200 && json.data) {
            console.debug(`[${urlEndpoint}] fetch response (${(0, time_helpers_1.ageInSeconds)(startTime)} seconds):`, json.data);
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
        const releaseMutex = await trendingMutexes[types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS].acquire();
        try {
            const storageToots = await Storage_1.default.getToots(types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS);
            if (storageToots && !(await Storage_1.default.isDataStale())) {
                console.debug(`[fediverseTrendingToots] using cached trending toots:`, storageToots);
                return storageToots;
            }
            else {
                const trendingTootses = await this.callForAllServers(s => s.fetchTrendingToots());
                let trendingToots = Object.values(trendingTootses).flat();
                setTrendingRankToAvg(trendingToots);
                trendingToots = toot_1.default.dedupeToots(trendingToots, "fediverseTrendingToots");
                await Storage_1.default.storeToots(types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS, trendingToots);
                console.log(`[fediverseTrendingToots] fetched trending toots:`, trendingToots);
                return trendingToots;
            }
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Get the top trending links from all servers
    static async fediverseTrendingLinks() {
        const releaseMutex = await trendingMutexes[types_1.StorageKey.FEDIVERSE_TRENDING_LINKS].acquire();
        try {
            const storageLinks = await Storage_1.default.get(types_1.StorageKey.FEDIVERSE_TRENDING_LINKS);
            if (storageLinks && !(await Storage_1.default.isDataStale())) {
                console.debug(`[fediverseTrendingLinks] using cached trending links:`, storageLinks);
                return storageLinks;
            }
            else {
                const serverLinks = await this.callForAllServers(s => s.fetchTrendingLinks());
                console.debug(`[fediverseTrendingLinks] Links from all servers:`, serverLinks);
                const links = feature_scorer_1.default.uniquifyTrendingObjs(Object.values(serverLinks).flat(), link => link.url);
                console.info(`[fediverseTrendingLinks] Found ${links.length} unique trending links`);
                await Storage_1.default.set(types_1.StorageKey.FEDIVERSE_TRENDING_LINKS, links);
                return links;
            }
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Get the top trending tags from all servers
    static async fediverseTrendingTags() {
        const releaseMutex = await trendingMutexes[types_1.StorageKey.FEDIVERSE_TRENDING_TAGS].acquire();
        try {
            const storageTags = await Storage_1.default.get(types_1.StorageKey.FEDIVERSE_TRENDING_TAGS);
            if (storageTags && !(await Storage_1.default.isDataStale())) {
                console.debug(`[fediverseTrendingLinks] using cached trending tags:`, storageTags);
                return storageTags;
            }
            else {
                const serverTags = await this.callForAllServers(s => s.fetchTrendingTags());
                console.debug(`[fediverseTrendingTags] tags from all servers:`, serverTags);
                const allTags = Object.values(serverTags).flat();
                const tags = feature_scorer_1.default.uniquifyTrendingObjs(allTags, tag => tag.name);
                console.info(`[fediverseTrendingTags] fetched unique tags:`, tags);
                let returnTags = tags.slice(0, Storage_1.default.getConfig().numTrendingTags);
                await Storage_1.default.set(types_1.StorageKey.FEDIVERSE_TRENDING_TAGS, returnTags);
                return returnTags;
            }
        }
        finally {
            releaseMutex();
        }
    }
    // Returns a dict of servers with MAU over the minServerMAU threshold
    // and the ratio of the number of users followed on a server to the MAU of that server.
    static async mastodonServersInfo() {
        console.debug(`[mastodonServersInfo] fetching remote server info...`);
        const config = Storage_1.default.getConfig();
        const follows = await api_1.MastoApi.instance.getFollowedAccounts(); // TODO: this is a major bottleneck
        // Find the top numServersToCheck servers among accounts followed by the user to check for trends.
        const followedServerUserCounts = (0, collection_helpers_1.countValues)(follows, account => account.homeserver());
        const mostFollowedServers = (0, collection_helpers_1.sortKeysByValue)(followedServerUserCounts).slice(0, config.numServersToCheck);
        let serverMAUs = await this.callForServers(mostFollowedServers, (s) => s.fetchMonthlyUsers());
        const validServers = (0, collection_helpers_1.atLeastValues)(serverMAUs, config.minServerMAU);
        const numValidServers = Object.keys(validServers).length;
        const numDefaultServers = config.numServersToCheck - numValidServers;
        console.debug(`followedServerUserCounts:`, followedServerUserCounts, `\nserverMAUs:`, serverMAUs);
        if (numDefaultServers > 0) {
            console.warn(`Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} user threshold`);
            const extraServers = config.defaultServers.filter(s => !serverMAUs[s]).slice(0, numDefaultServers);
            const extraServerMAUs = await this.callForServers(extraServers, (s) => s.fetchMonthlyUsers());
            console.log(`Extra default server MAUs:`, extraServerMAUs);
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
        console.log(`Constructed MastodonServersInfo object:`, mastodonServers);
        return mastodonServers;
    }
    ;
    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    static async callForAllServers(fxn) {
        const domains = await api_1.MastoApi.instance.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    }
    ;
    // Call 'fxn' for a list of domains and return a dict keyed by domain
    static async callForServers(domains, fxn) {
        return await (0, collection_helpers_1.zipPromises)(domains, async (domain) => fxn(new MastodonServer(domain)));
    }
    ;
}
exports.default = MastodonServer;
;
// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
function setTrendingRankToAvg(rankedToots) {
    const tootsTrendingOnMultipleServers = (0, collection_helpers_1.groupBy)(rankedToots, toot => toot.uri);
    Object.entries(tootsTrendingOnMultipleServers).forEach(([_uri, toots]) => {
        const avgScore = (0, collection_helpers_1.average)(toots.map(t => t.reblog?.trendingRank || t.trendingRank));
        toots.forEach((toot) => {
            toot.trendingRank = avgScore;
            if (toot.reblog) {
                toot.reblog.trendingRank = avgScore;
                console.log(`[setTrendingRankToAvg] for reblog to ${avgScore}:`, toot);
            }
        });
    });
}
;
//# sourceMappingURL=mastodon_server.js.map