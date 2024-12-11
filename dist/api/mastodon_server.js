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
const feature_scorer_1 = __importDefault(require("../scorer/feature_scorer"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const helpers_1 = require("../helpers");
const account_1 = require("./objects/account");
const api_1 = require("./api");
const tag_1 = require("./objects/tag");
class MastodonServer {
    domain;
    constructor(domain) {
        this.domain = domain;
    }
    ;
    // Fetch toots that are trending on this server
    async fetchTrendingToots() {
        const toots = await this.fetchList(api_1.MastoApi.trendUrl(api_1.STATUSES));
        const trendingToots = toots.map(t => new toot_1.default(t)).filter(t => t.popularity() > 0);
        // Inject toots with a trendingRank score that is reverse-ordered. e.g most popular
        // trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        trendingToots.forEach((toot, i) => toot.trendingRank = 1 + (trendingToots?.length || 0) - i);
        return trendingToots;
    }
    // Get the links that are trending on this server
    async fetchTrendingLinks() {
        const numLinks = Storage_1.default.getConfig().numTrendingLinksPerServer;
        const trendingLinks = await this.fetchList(api_1.MastoApi.trendUrl(api_1.LINKS), numLinks);
        trendingLinks.forEach(feature_scorer_1.default.decorateHistoryScores);
        return trendingLinks;
    }
    ;
    // Get the tags that are trending on 'server'
    async fetchTrendingTags() {
        const numTags = Storage_1.default.getConfig().numTrendingTagsPerServer;
        const trendingTags = await this.fetchList(api_1.MastoApi.trendUrl(api_1.TAGS), numTags);
        trendingTags.forEach(tag => feature_scorer_1.default.decorateHistoryScores((0, tag_1.repairTag)(tag)));
        return trendingTags;
    }
    ;
    // Get publicly available MAU information for this server.
    async fetchMonthlyUsers() {
        if (Storage_1.default.getConfig().noMauServers.some(s => this.domain.startsWith(s))) {
            console.debug(`monthlyUsers() for '${this.domain}' is not available, skipping...`);
            return 0;
        }
        try {
            const instance = await this.fetch(api_1.MastoApi.v2Url(api_1.INSTANCE));
            console.debug(`monthlyUsers() for '${this.domain}', 'instance' var: `, instance);
            return instance ? instance.usage.users.activeMonth : 0;
        }
        catch (error) {
            console.warn(`Error in getMonthlyUsers() for server ${this.domain}`, error);
            return 0;
        }
    }
    ;
    // Fetch a list of objects of type T from a public API endpoint
    async fetchList(endpoint, limit) {
        const label = endpoint.split("/").pop();
        let list = [];
        try {
            list = await this.fetch(endpoint);
            if (!list?.length) {
                throw new Error(`No ${label} found! list: ${JSON.stringify(list)}`);
            }
        }
        catch (e) {
            console.warn(`[fetchList] Failed to get data from '${this.domain}/${endpoint}!`, e);
        }
        console.debug(`Retrieved ${list.length} trending ${label} from '${this.domain}':`, list);
        return list;
    }
    ;
    // Get data from a public API endpoint on a Mastodon server.
    async fetch(endpoint, limit) {
        let url = `https://${this.domain}/${endpoint}`;
        if (limit)
            url += `?limit=${limit}`;
        const json = await axios_1.default.get(url);
        console.debug(`mastodonFetch() response for '${url}':`, json);
        if (json.status === 200 && json.data) {
            return (0, helpers_1.transformKeys)(json.data, change_case_1.camelCase);
        }
        else {
            throw json;
        }
    }
    ;
    ////////////////////
    // Static Methods //
    ////////////////////
    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots() {
        let trendingTootses = await this.callForAllServers((s) => s.fetchTrendingToots());
        let trendingToots = Object.values(trendingTootses).flat();
        setTrendingRankToAvg(trendingToots);
        return toot_1.default.dedupeToots(trendingToots, "getTrendingToots");
    }
    ;
    static async fediverseTrendingLinks() {
        const serverLinks = await this.callForAllServers(s => s.fetchTrendingLinks());
        console.info(`[fediverseTrendingLinks] links from all servers:`, serverLinks);
        const links = feature_scorer_1.default.uniquifyTrendingObjs(Object.values(serverLinks).flat());
        console.info(`[fediverseTrendingLinks] unique links:`, links);
        return links;
    }
    ;
    // Get the top trending tags from all servers
    static async fediverseTrendingTags() {
        const serverTags = await this.callForAllServers(s => s.fetchTrendingTags());
        console.info(`[fediverseTrendingTags] tags from all servers:`, serverTags);
        const tags = feature_scorer_1.default.uniquifyTrendingObjs(Object.values(serverTags).flat());
        console.info(`[fediverseTrendingTags] unique tags:`, tags);
        return tags.slice(0, Storage_1.default.getConfig().numTrendingTags);
    }
    // Returns something called "overrepresentedServerFrequ"??
    static async mastodonServersInfo() {
        const config = Storage_1.default.getConfig();
        const follows = await api_1.MastoApi.instance.fetchFollowedAccounts();
        // Find the top numServersToCheck servers among accounts followed by the user to check for trends.
        const followedServerUserCounts = (0, helpers_1.countValues)(follows, account => (0, account_1.extractServer)(account));
        const mostFollowedServers = (0, helpers_1.sortKeysByValue)(followedServerUserCounts).slice(0, config.numServersToCheck);
        let serverMAUs = await this.callForServers(mostFollowedServers, (s) => s.fetchMonthlyUsers());
        const validServers = (0, helpers_1.atLeastValues)(serverMAUs, config.minServerMAU);
        const numValidServers = Object.keys(validServers).length;
        const numDefaultServers = config.numServersToCheck - numValidServers;
        console.debug(`followedServerUserCounts:`, followedServerUserCounts, `\nserverMAUs:`, serverMAUs);
        console.debug(`validServers:`, validServers);
        if (numDefaultServers > 0) {
            console.warn(`Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} user threshold`);
            const extraServers = config.defaultServers.filter(s => !serverMAUs[s]).slice(0, numDefaultServers);
            const extraServerMAUs = await this.callForServers(extraServers, (s) => s.fetchMonthlyUsers());
            console.log(`Extra default server MAUs:`, extraServerMAUs);
            serverMAUs = { ...validServers, ...extraServerMAUs };
        }
        // Create a dict of the ratio of the number of users followed on a server to the MAU of that server.
        const overrepresentedServerFreq = Object.keys(serverMAUs).reduce((overRepped, server) => {
            overRepped[server] = (followedServerUserCounts[server] || 0) / serverMAUs[server];
            return overRepped;
        }, {});
        console.log(`Final serverMAUs: `, serverMAUs);
        console.log(`Final overrepresentedServerFreq: `, overrepresentedServerFreq);
        return overrepresentedServerFreq;
    }
    ;
    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    static async callForAllServers(fxn) {
        const domains = await api_1.MastoApi.instance.getTopServerDomains();
        return await this.callForServers(domains, fxn);
    }
    ;
    // Call 'fxn' for all the top servers and return a dict keyed by server domain
    static async callForServers(domains, fxn) {
        return await (0, helpers_1.zipPromises)(domains, async (domain) => fxn(new MastodonServer(domain)));
    }
    ;
}
exports.default = MastodonServer;
;
// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
function setTrendingRankToAvg(rankedToots) {
    const tootsTrendingOnMultipleServers = (0, helpers_1.groupBy)(rankedToots, (toot) => toot.uri);
    Object.entries(tootsTrendingOnMultipleServers).forEach(([_uri, toots]) => {
        const avgScore = (0, helpers_1.average)(toots.map(t => t.trendingRank));
        toots.forEach(toot => toot.trendingRank = avgScore);
    });
}
;
//# sourceMappingURL=mastodon_server.js.map