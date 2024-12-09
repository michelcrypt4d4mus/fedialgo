"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwIfAccessTokenRevoked = exports.MastoApi = void 0;
/*
 * Helper methods for using mastodon API.
 */
const async_mutex_1 = require("async-mutex");
const home_feed_1 = __importDefault(require("../feeds/home_feed"));
const trending_tags_1 = __importDefault(require("../feeds/trending_tags"));
const trending_toots_1 = __importDefault(require("../feeds/trending_toots"));
const mastodon_servers_info_1 = __importDefault(require("./mastodon_servers_info"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const account_1 = require("./objects/account");
const helpers_1 = require("../helpers");
const types_1 = require("../types");
const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const STATUSES = "statuses";
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
                (0, trending_toots_1.default)(this.api),
                (0, trending_tags_1.default)(this.api),
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
        const mastoQuery = { limit: limit, q: searchQuery, type: STATUSES };
        try {
            const searchResult = await this.api.v2.search.fetch(mastoQuery);
            const toots = searchResult.statuses.map(t => new toot_1.default(t));
            console.debug(`[searchForToots] Found toots for query`, mastoQuery);
            return toots;
        }
        catch (e) {
            throwIfAccessTokenRevoked(e, `Failed to get toots for query '${searchQuery}'`);
            return [];
        }
    }
    ;
    // Get the user's recent toots
    async getUserRecentToots() {
        const recentToots = await this.mastodonFetchPages({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: types_1.Key.RECENT_USER_TOOTS
        });
        return recentToots.map(t => new toot_1.default(t));
    }
    ;
    async getFollowedAccounts() {
        return (0, account_1.buildAccountNames)(await this.fetchFollowedAccounts());
    }
    ;
    async fetchFollowedAccounts() {
        return await this.mastodonFetchPages({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: types_1.Key.FOLLOWED_ACCOUNTS,
            maxRecords: Storage_1.default.getConfig().maxFollowingAccountsToPull,
        });
    }
    ;
    // Get a count of number of favorites for each account in the user's recent favorites
    async getMostFavouritedAccounts() {
        const recentFavoriteToots = await this.fetchRecentFavourites();
        return (0, helpers_1.countValues)(recentFavoriteToots, (toot) => toot.account?.acct);
    }
    async getFollowedTags() {
        return await this.mastodonFetchPages({
            fetch: this.api.v1.followedTags.list,
            label: types_1.WeightName.FOLLOWED_TAGS
        });
    }
    async getRecentNotifications() {
        return await this.mastodonFetchPages({
            fetch: this.api.v1.notifications.list,
            label: types_1.Key.RECENT_NOTIFICATIONS
        });
    }
    // Get an array of Toots the user has recently favourited
    async fetchRecentFavourites() {
        return await this.mastodonFetchPages({
            fetch: this.api.v1.favourites.list,
            label: types_1.WeightName.FAVORITED_ACCOUNTS
        });
    }
    ;
    // TODO: should we cache this?
    async getServerSideFilters() {
        console.log(`getServerSideFilters() called`);
        // let filters = await this.get(Key.SERVER_SIDE_FILTERS) as mastodon.v2.Filter[];
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
    // Returns information about mastodon servers
    async getCoreServer() {
        return await (0, mastodon_servers_info_1.default)(await this.fetchFollowedAccounts());
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    async getTopServerDomains(api) {
        const coreServers = await this.getCoreServer();
        // Count the number of followed users per server
        const topServerDomains = Object.keys(coreServers)
            .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
            .sort((a, b) => (coreServers[b] - coreServers[a]));
        console.log(`[API] Found top server domains:`, topServerDomains);
        return topServerDomains;
    }
    ;
    async mastodonFetchPages(fetchParams) {
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
            throwIfAccessTokenRevoked(e, `mastodonFetchPages() for ${label} failed`);
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
    static v1Url = (path) => `${API_V1}/${path}`;
    static v2Url = (path) => `${API_V2}/${path}`;
    static trendUrl = (path) => this.v1Url(`trends/${path}`);
}
exports.MastoApi = MastoApi;
;
// re-raise access revoked errors.
function throwIfAccessTokenRevoked(e, msg) {
    console.error(`${msg}. Error:`, e);
    if (!(e instanceof Error))
        return;
    if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
        throw e;
    }
}
exports.throwIfAccessTokenRevoked = throwIfAccessTokenRevoked;
;
//# sourceMappingURL=api.js.map