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
exports.MastoApi = exports.TAGS = exports.STATUSES = exports.LINKS = exports.INSTANCE = void 0;
const async_mutex_1 = require("async-mutex");
const trending_tags_1 = __importDefault(require("../feeds/trending_tags"));
const mastodon_server_1 = __importDefault(require("./mastodon_server"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importStar(require("./objects/toot"));
const account_1 = require("./objects/account");
const helpers_1 = require("../helpers");
const tag_1 = require("./objects/tag");
const helpers_2 = require("../helpers");
const types_1 = require("../types");
exports.INSTANCE = "instance";
exports.LINKS = "links";
exports.STATUSES = "statuses";
exports.TAGS = "tags";
const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const DEFAULT_BREAK_IF = (pageOfResults, allResults) => false;
;
// Singleton class for interacting with the Mastodon API
class MastoApi {
    api;
    user;
    homeDomain;
    mutexes;
    static #instance;
    static init(api, user) {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }
        console.log(`[MastoApi] Initializing MastoApi instance with user:`, user.acct);
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
        this.homeDomain = (0, helpers_1.extractDomain)(user.url);
        // Initialize mutexes for each key in Key and WeightName
        this.mutexes = {};
        for (const key in types_1.StorageKey)
            this.mutexes[types_1.StorageKey[key]] = new async_mutex_1.Mutex();
        for (const key in types_1.WeightName)
            this.mutexes[types_1.WeightName[key]] = new async_mutex_1.Mutex();
    }
    ;
    // Get the toots that make up the user's home timeline feed
    async getTimelineToots(numTimelineToots, maxId) {
        console.debug(`[MastoApi] getFeed(numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots ||= Storage_1.default.getConfig().numTootsInFirstFetch;
        let promises = [
            this.fetchHomeFeed(numTimelineToots, maxId),
        ];
        // Only fetch trending toots first time this is called (skip when paging through timeline)
        if (!maxId) {
            promises = promises.concat([
                mastodon_server_1.default.fediverseTrendingToots(),
                (0, trending_tags_1.default)(), // ORDER MATTERS! must be 2nd for handling below
            ]);
        }
        const allResponses = await Promise.all(promises);
        console.debug(`[MastoApi] getFeed() allResponses: ${JSON.stringify(allResponses, null, 4)}`);
        const homeToots = allResponses.shift(); // Pop timeline toots off the array
        let trendingTags, trendingToots, trendingTagToots;
        let otherToots = [];
        if (allResponses.length > 0) {
            trendingToots = allResponses.shift();
            trendingTagToots = allResponses.shift();
            trendingTags = trendingTagToots.tags;
            otherToots = trendingToots.concat(trendingTagToots.toots);
        }
        return {
            homeToots,
            otherToots,
            trendingTags,
            trendingToots,
        };
    }
    ;
    // Retrieve background data about the user that will be used for scoring etc.
    async getStartupData() {
        const responses = await Promise.all([
            this.fetchBlockedAccounts(),
            this.fetchMutedAccounts(),
            this.getServerSideFilters(),
        ]);
        return {
            mutedAccounts: (0, account_1.buildAccountNames)(responses[0].concat(responses[1])),
            serverSideFilters: responses[2],
        };
    }
    ;
    // Get the user's home timeline feed (recent toots from followed accounts and hashtags)
    async fetchHomeFeed(numToots, maxId) {
        const timelineLookBackMS = Storage_1.default.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
        const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
        const statuses = await this.fetchData({
            fetch: this.api.v1.timelines.home.list,
            label: types_1.StorageKey.HOME_TIMELINE,
            maxId: maxId,
            maxRecords: numToots || Storage_1.default.getConfig().maxTimelineTootsToFetch,
            skipCache: true,
            breakIf: (pageOfResults, allResults) => {
                const oldestTootAt = (0, toot_1.earliestTootedAt)(allResults) || new Date();
                console.log(`oldest in page: ${(0, toot_1.earliestTootedAt)(pageOfResults)}, oldest: ${oldestTootAt})`);
                if (oldestTootAt && oldestTootAt < cutoffTimelineAt) {
                    console.log(`Halting fetchHomeFeed() pages bc oldestTootAt='${oldestTootAt}'`);
                    return true;
                }
                return false;
            }
        });
        const toots = statuses.map((status) => new toot_1.default(status));
        console.debug(`fetchHomeFeed() found ${toots.length} toots (oldest: '${(0, toot_1.earliestTootedAt)(toots)}'):`, toots);
        return toots;
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
            label: types_1.StorageKey.RECENT_USER_TOOTS
        });
        return recentToots.map(t => new toot_1.default(t));
    }
    ;
    // Get accounts the user is following
    async fetchFollowedAccounts() {
        return await this.fetchData({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: types_1.StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: Storage_1.default.getConfig().maxFollowingAccountsToPull,
        });
    }
    ;
    // Get hashtags the user is following
    async getFollowedTags() {
        const followedTags = await this.fetchData({
            fetch: this.api.v1.followedTags.list,
            label: types_1.StorageKey.FOLLOWED_TAGS
        });
        return followedTags.map(tag_1.repairTag);
    }
    // Get the user's recent notifications
    async getRecentNotifications() {
        return await this.fetchData({
            fetch: this.api.v1.notifications.list,
            label: types_1.StorageKey.RECENT_NOTIFICATIONS
        });
    }
    // Get an array of Toots the user has recently favourited
    async fetchRecentFavourites() {
        return await this.fetchData({
            fetch: this.api.v1.favourites.list,
            label: types_1.StorageKey.FAVOURITED_ACCOUNTS
        });
    }
    ;
    async fetchBlockedAccounts() {
        return await this.fetchData({
            fetch: this.api.v1.blocks.list,
            label: types_1.StorageKey.BLOCKED_ACCOUNTS
        });
    }
    ;
    async fetchMutedAccounts() {
        return await this.fetchData({
            fetch: this.api.v1.mutes.list,
            label: types_1.StorageKey.MUTED_ACCOUNTS
        });
    }
    ;
    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.fetchData() doesn't work here because it's a v2 endpoint
    async getServerSideFilters() {
        console.debug(`getServerSideFilters() called...`);
        const releaseMutex = await this.mutexes[types_1.StorageKey.SERVER_SIDE_FILTERS].acquire();
        let filters = await Storage_1.default.get(types_1.StorageKey.SERVER_SIDE_FILTERS);
        try {
            if (!filters || (await this.shouldReloadFeatures())) {
                filters = await this.api.v2.filters.list();
                // Filter out filters that either are just warnings or don't apply to the home context
                filters = filters.filter(filter => {
                    // Before Mastodon 4.0 Filter objects lacked a 'context' property altogether
                    if (filter.context?.length > 0 && !filter.context.includes("home"))
                        return false;
                    if (filter.filterAction != "hide")
                        return false;
                    return true;
                });
                await Storage_1.default.set(types_1.StorageKey.SERVER_SIDE_FILTERS, filters);
                console.log(`Retrieved remote server side filters:`, filters);
            }
            else {
                filters = filters;
                console.debug(`Loaded server side filters from cache:`, filters);
            }
        }
        finally {
            releaseMutex();
        }
        return filters;
    }
    ;
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    async getTopServerDomains() {
        const releaseMutex = await this.mutexes[types_1.StorageKey.POPULAR_SERVERS].acquire();
        try {
            let servers = await Storage_1.default.get(types_1.StorageKey.POPULAR_SERVERS);
            if (!servers || (await this.shouldReloadFeatures())) {
                servers = await mastodon_server_1.default.mastodonServersInfo();
                await Storage_1.default.set(types_1.StorageKey.POPULAR_SERVERS, servers);
            }
            else {
                console.log(`Loaded popular servers from cache:`, servers);
                servers = servers;
            }
            const topServerDomains = (0, helpers_2.sortKeysByValue)(servers);
            console.log(`[API] Found top server domains:`, topServerDomains);
            return topServerDomains;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // "https://universeodon.com/@JoParkerBear@universeodon.com" => "https://universeodon.com/@JoParkerBear"
    // TODO: maybe rename to getLocalAccountURL()?
    getAccountURL(account) {
        if (account.url.endsWith(`@${this.homeDomain}`)) {
            return account.url.substring(0, account.url.lastIndexOf('@'));
        }
        else {
            return account.url;
        }
    }
    ;
    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot) {
        console.debug(`resolveToot() called for`, toot);
        const tootURI = toot.realURI();
        const urlDomain = (0, helpers_1.extractDomain)(tootURI);
        if (urlDomain == this.homeDomain)
            return toot;
        const lookupResult = await this.api.v2.search.fetch({ q: tootURI, resolve: true });
        if (!lookupResult?.statuses?.length) {
            const msg = `resolveToot('${tootURI}') got bad result:`;
            console.warn(msg, lookupResult);
            throw new Error(`${msg}\n${JSON.stringify(lookupResult)}`);
        }
        const resolvedStatus = lookupResult.statuses[0];
        console.debug(`resolveToot('${tootURI}') found resolvedStatus:`, resolvedStatus);
        return new toot_1.default(resolvedStatus);
    }
    ;
    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    async fetchData(fetchParams) {
        let { breakIf, fetch, label, maxId, maxRecords, skipCache } = fetchParams;
        breakIf = breakIf || DEFAULT_BREAK_IF;
        maxRecords ||= Storage_1.default.getConfig().minRecordsForFeatureScoring;
        console.debug(`[API] ${label}: fetchData() called (maxRecords=${maxRecords})`);
        const releaseFetchMutex = await this.mutexes[label].acquire();
        let results = [];
        let pageNumber = 0;
        try {
            if (!skipCache) {
                const cachedData = await Storage_1.default.get(label);
                if (cachedData && !(await this.shouldReloadFeatures())) {
                    const rows = cachedData;
                    console.log(`[API] ${label}: Loaded ${rows.length} cached records:`, cachedData);
                    return rows;
                }
                ;
            }
            for await (const page of fetch(MastoApi.buildParams(maxId))) {
                results = results.concat(page);
                console.debug(`[API] ${label}: Retrieved page ${++pageNumber}`);
                if (results.length >= maxRecords || breakIf(page, results)) {
                    console.log(`[API] ${label}: Halting fetch at page ${pageNumber} w/ ${results.length} records`);
                    break;
                }
            }
            console.log(`[API] ${label}: Fetched ${results.length} records:`, results);
            await Storage_1.default.set(label, results);
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `fetchData() for ${label} failed`);
            return results;
        }
        finally {
            releaseFetchMutex();
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
    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    static buildParams(maxId, limit) {
        let params = {
            limit: limit || Storage_1.default.getConfig().defaultRecordsPerPage
        };
        if (maxId)
            params = { ...params, maxId: `${maxId}` };
        return params;
    }
    ;
    static v1Url = (path) => `${API_V1}/${path}`;
    static v2Url = (path) => `${API_V2}/${path}`;
    static trendUrl = (path) => this.v1Url(`trends/${path}`);
}
exports.MastoApi = MastoApi;
;
//# sourceMappingURL=api.js.map