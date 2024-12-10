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
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const helpers_1 = require("../helpers");
const tag_1 = require("./objects/tag");
const account_1 = require("./objects/account");
const api_1 = require("./api");
const helpers_2 = require("../helpers");
class MastodonServer {
    domain;
    constructor(domain) {
        this.domain = domain;
    }
    ;
    // Get the tags that are trending on 'server'
    async fetchTrendingTags(numTags) {
        numTags ||= Storage_1.default.getConfig().numTrendingTagsPerServer;
        const tagsUrl = api_1.MastoApi.trendUrl(api_1.TAGS);
        let tags;
        try {
            tags = await this.fetch(tagsUrl, numTags);
            if (!tags || tags.length == 0)
                throw new Error(`No tags found on '${this.domain}'!`);
        }
        catch (e) {
            console.warn(`[TrendingTags] Failed to get trending toots from '${this.domain}'!`, e);
            return [];
        }
        const trendingTags = tags.map(tag_1.decorateTrendingTag);
        console.debug(`[TrendingTags] trendingTags for server '${this.domain}':`, trendingTags);
        return trendingTags;
    }
    ;
    // Fetch toots that are trending on this server
    async fetchTrendingToots() {
        let topToots = [];
        try {
            topToots = await this.fetch(api_1.MastoApi.trendUrl(api_1.STATUSES));
            if (!topToots?.length)
                throw new Error(`Failed to get topToots, got: ${JSON.stringify(topToots)}`);
            topToots = topToots.map(t => new toot_1.default(t));
        }
        catch (e) {
            console.warn(`Error fetching trending toots from '${this.domain}':`, e);
            return [];
        }
        topToots = topToots.filter(toot => toot.popularity() > 0);
        let filteredToots = topToots.filter(toot => toot.popularity() > 0);
        console.debug(`trendingToots() Removed ${topToots.length - filteredToots.length} toots with no favorites or retoots`);
        // Inject toots with at least one favorite of retoot with a trendingRank score that is reverse-ordered.
        // e.g most popular trending toot gets numTrendingTootsPerServer points, least trending gets 1).
        filteredToots.forEach((toot, i) => toot.trendingRank = 1 + (filteredToots?.length || 0) - i);
        console.debug(`trendingToots for '${this.domain}': `, filteredToots.map(t => t.condensedStatus()));
        return filteredToots ?? [];
    }
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
    // Get data from a public API endpoint on a Mastodon server.
    async fetch(endpoint, limit) {
        let url = `https://${this.domain}/${endpoint}`;
        if (limit)
            url += `?limit=${limit}`;
        console.debug(`mastodonFetch() URL: '${url}'`);
        try {
            const json = await axios_1.default.get(url);
            console.debug(`mastodonFetch() response for '${url}':`, json);
            if (json.status === 200 && json.data) {
                return (0, helpers_2.transformKeys)(json.data, change_case_1.camelCase);
            }
            else {
                throw json;
            }
        }
        catch (e) {
            console.warn(`Error fetching data from '${url}'`, e);
            return;
        }
    }
    ;
    ////////////////////
    // Static Methods //
    ////////////////////
    // Pull public top trending toots on popular mastodon servers including from accounts user doesn't follow.
    static async fediverseTrendingToots() {
        console.log(`[TrendingToots] fetchTrendingToots() called`);
        // Pull top trending toots from each server
        let trendingTootses = await this.callForAllServers((server) => server.fetchTrendingToots());
        let trendingToots = Object.values(trendingTootses).flat();
        setTrendingRankToAvg(trendingToots);
        return toot_1.default.dedupeToots(trendingToots, "getTrendingToots");
    }
    ;
    // Returns something called "overrepresentedServerFrequ"??
    static async mastodonServersInfo() {
        const config = Storage_1.default.getConfig();
        const follows = await api_1.MastoApi.instance.fetchFollowedAccounts();
        // Find the top numServersToCheck servers among accounts followed by the user to check for trends.
        const followedServerUserCounts = (0, helpers_1.countValues)(follows, account => (0, account_1.extractServer)(account));
        const mostFollowedServers = (0, helpers_1.sortKeysByValue)(followedServerUserCounts).slice(0, config.numServersToCheck);
        console.debug(`mastodonServersInfo() userServerCounts: `, followedServerUserCounts);
        let serverMAUs = await this.callForServers(mostFollowedServers, (server) => server.fetchMonthlyUsers());
        console.log(`mastodonServersInfo() serverMAUs: `, serverMAUs);
        const validServers = (0, helpers_1.atLeastValues)(serverMAUs, config.minServerMAU);
        const numValidServers = Object.keys(validServers).length;
        const numDefaultServers = config.numServersToCheck - numValidServers;
        console.debug(`Most followed servers:`, mostFollowedServers, `\nserverMAUs:`, serverMAUs, `\nvalidServers:`, validServers);
        if (numDefaultServers > 0) {
            console.warn(`Only got ${numValidServers} servers w/MAU over the ${config.minServerMAU} user threshold`);
            const extraServers = config.defaultServers.filter(s => !serverMAUs[s]).slice(0, numDefaultServers);
            const extraServerMAUs = await this.callForServers(extraServers, (server) => server.fetchMonthlyUsers());
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