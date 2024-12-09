"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastoApi = exports.STATUSES = void 0;
const async_mutex_1 = require("async-mutex");
const home_feed_1 = __importDefault(require("../feeds/home_feed"));
const trending_tags_1 = __importDefault(require("../feeds/trending_tags"));
const mastodon_servers_info_1 = __importDefault(require("./mastodon_servers_info"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const account_1 = require("./objects/account");
const helpers_1 = require("../helpers");
const types_1 = require("../types");
const mastodon_servers_info_2 = require("./mastodon_servers_info");
exports.STATUSES = "statuses";
const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
;
// Singleton class for interacting with the Mastodon API
class MastoApi {
    api;
    user;
    mutexes;
    static #instance;
    static init(api, user) {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }
        MastoApi.#instance = new MastoApi(api, user);
    }
    ;
    static get instance() {
        if (!MastoApi.#instance)
            throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }
    ;
    constructor(api, user) {
        this.api = api;
        this.user = user;
        this.mutexes = {};
        // Initialize mutexes for each key in Key and WeightName
        for (const key in types_1.Key)
            this.mutexes[types_1.Key[key]] = new async_mutex_1.Mutex();
        for (const key in types_1.WeightName)
            this.mutexes[types_1.WeightName[key]] = new async_mutex_1.Mutex();
    }
    ;
    // Get the toots that make up the user's home timeline feed
    async getTimelineToots(numTimelineToots, maxId) {
        console.debug(`[MastoApi] getFeed(numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage_1.default.getConfig().numTootsInFirstFetch;
        let promises = [(0, home_feed_1.default)(this.api, numTimelineToots, maxId)];
        // Only retrieve trending toots on the first call to this method
        if (!maxId) {
            promises = promises.concat([
                (0, mastodon_servers_info_1.default)(),
                (0, trending_tags_1.default)(),
            ]);
        }
        const allResponses = await Promise.all(promises);
        console.debug(`[MastoApi] getFeed() allResponses:`, allResponses);
        const homeToots = allResponses.shift();
        return {
            homeToots: homeToots,
            otherToots: allResponses.flat(),
        };
    }
    ;
    // Retrieve background data about the user that will be used for scoring etc.
    async getStartupData() {
        const responses = await Promise.all([
            this.fetchFollowedAccounts(),
            this.getFollowedTags(),
            this.getServerSideFilters(),
        ]);
        return {
            followedAccounts: (0, account_1.buildAccountNames)(responses[0]),
            followedTags: (0, helpers_1.countValues)(responses[1], (tag) => tag.name.toLowerCase()),
            serverSideFilters: responses[2],
        };
    }
    ;
    // the search API can be used to search for toots, profiles, or hashtags. this is for toots.
    async searchForToots(searchQuery, limit) {
        limit = limit || Storage_1.default.getConfig().defaultRecordsPerPage;
        console.debug(`[searchForToots] getting toots for query '${searchQuery}'`);
        const mastoQuery = { limit: limit, q: searchQuery, type: exports.STATUSES };
        try {
            const searchResult = await this.api.v2.search.fetch(mastoQuery);
            const toots = searchResult.statuses.map(t => new toot_1.default(t));
            console.debug(`[searchForToots] Found toots for query`, mastoQuery);
            return toots;
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `Failed to get toots for query '${searchQuery}'`);
            return [];
        }
    }
    ;
    // Get the user's recent toots
    async getUserRecentToots() {
        const recentToots = await this.fetchData({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: types_1.Key.RECENT_USER_TOOTS
        });
        return recentToots.map(t => new toot_1.default(t));
    }
    ;
    // Get accounts the user is following
    async fetchFollowedAccounts() {
        return await this.fetchData({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: types_1.Key.FOLLOWED_ACCOUNTS,
            maxRecords: Storage_1.default.getConfig().maxFollowingAccountsToPull,
        });
    }
    ;
    // Get hashtags the user is following
    async getFollowedTags() {
        return await this.fetchData({
            fetch: this.api.v1.followedTags.list,
            label: types_1.WeightName.FOLLOWED_TAGS
        });
    }
    // Get the user's recent notifications
    async getRecentNotifications() {
        return await this.fetchData({
            fetch: this.api.v1.notifications.list,
            label: types_1.Key.RECENT_NOTIFICATIONS
        });
    }
    // Get an array of Toots the user has recently favourited
    async fetchRecentFavourites() {
        return await this.fetchData({
            fetch: this.api.v1.favourites.list,
            label: types_1.WeightName.FAVORITED_ACCOUNTS
        });
    }
    ;
    // TODO: should we cache this?
    async getServerSideFilters() {
        console.log(`getServerSideFilters() called`);
        let filters = await this.api.v2.filters.list();
        // Filter out filters that either are just warnings or don't apply to the home context
        filters = filters.filter(filter => {
            // before 4.0 Filter objects lacked a 'context' property altogether
            if (filter.context?.length > 0 && !filter.context.includes("home"))
                return false;
            if (filter.filterAction != "hide")
                return false;
            return true;
        });
        console.log(`Retrieved server side filters:`, filters);
        return filters;
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    async getTopServerDomains() {
        const releaseMutex = await this.mutexes[types_1.Key.POPULAR_SERVERS].acquire();
        try {
            let servers = await Storage_1.default.get(types_1.Key.POPULAR_SERVERS);
            ;
            if (!servers || (await this.shouldReloadFeatures())) {
                servers = await (0, mastodon_servers_info_2.mastodonServersInfo)(await this.fetchFollowedAccounts());
                await Storage_1.default.set(types_1.Key.POPULAR_SERVERS, servers);
            }
            else {
                console.log(`Loaded popular servers from cache:`, servers);
                servers = servers;
            }
            const topServerDomains = Object.keys(servers).sort((a, b) => (servers[b] - servers[a]));
            console.log(`[API] Found top server domains:`, topServerDomains);
            return topServerDomains;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Generic data fetcher
    async fetchData(fetchParams) {
        let { fetch, maxRecords, label } = fetchParams;
        maxRecords ||= Storage_1.default.getConfig().minRecordsForFeatureScoring;
        console.debug(`[API] ${label}: mastodonFetchPages() w/ maxRecords=${maxRecords}`);
        const releaseMutex = await this.mutexes[label].acquire();
        let results = [];
        let pageNumber = 0;
        try {
            const cachedData = await Storage_1.default.get(label);
            if (cachedData && !(await this.shouldReloadFeatures())) {
                const rows = cachedData;
                console.log(`[API] ${label}: Loaded ${rows.length} cached records:`, cachedData);
                return rows;
            }
            ;
            for await (const page of fetch({ limit: Storage_1.default.getConfig().defaultRecordsPerPage })) {
                results = results.concat(page);
                console.log(`[API] ${label}: Retrieved page ${++pageNumber} of current user's ${label}...`);
                if (results.length >= maxRecords) {
                    console.log(`[API] ${label}: Halting record retrieval at page ${pageNumber} w/ ${results.length} records`);
                    break;
                }
            }
            console.log(`[API] ${label}: Fetched ${results.length} records:`, results);
            await Storage_1.default.set(label, results);
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `mastodonFetchPages() for ${label} failed`);
            return results;
        }
        finally {
            releaseMutex();
        }
        return results;
    }
    ;
    // This doesn't quite work as advertised. It actually forces a reload every 10 app opens
    // starting at the 9th one. Also bc of the way it was implemented it won't work the same
    // way for any number other than 9.
    async shouldReloadFeatures() {
        return (await Storage_1.default.getNumAppOpens()) % 10 == Storage_1.default.getConfig().reloadFeaturesEveryNthOpen;
    }
    // Re-raise access revoked errors so they can trigger a logout() call
    throwIfAccessTokenRevoked(e, msg) {
        console.error(`${msg}. Error:`, e);
        if (!(e instanceof Error))
            return;
        if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
            throw e;
        }
    }
    static v1Url = (path) => `${API_V1}/${path}`;
    static v2Url = (path) => `${API_V2}/${path}`;
    static trendUrl = (path) => this.v1Url(`trends/${path}`);
}
exports.MastoApi = MastoApi;
;
//# sourceMappingURL=api.js.map