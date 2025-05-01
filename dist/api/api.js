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
const account_1 = __importDefault(require("./objects/account"));
const mastodon_server_1 = __importDefault(require("./mastodon_server"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importStar(require("./objects/toot"));
const string_helpers_1 = require("../helpers/string_helpers");
const types_1 = require("../types");
const tag_1 = require("./objects/tag");
const time_helpers_1 = require("../helpers/time_helpers");
const change_case_1 = require("change-case");
exports.INSTANCE = "instance";
exports.LINKS = "links";
exports.STATUSES = "statuses";
exports.TAGS = "tags";
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const DEFAULT_BREAK_IF = (pageOfResults, allResults) => false;
;
// Singleton class for interacting with the Mastodon API
class MastoApi {
    api;
    user;
    homeDomain;
    mutexes;
    userData; // Preserve user data for the session in the object to avoid having to go to local storage over and over
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
        this.homeDomain = (0, string_helpers_1.extractDomain)(user.url);
        // Initialize mutexes for each key in Key and WeightName
        this.mutexes = {};
        for (const key in types_1.StorageKey)
            this.mutexes[types_1.StorageKey[key]] = new async_mutex_1.Mutex();
        for (const key in types_1.WeightName)
            this.mutexes[types_1.WeightName[key]] = new async_mutex_1.Mutex();
    }
    ;
    // Get the user's home timeline feed (recent toots from followed accounts and hashtags)
    async fetchHomeFeed(numToots, maxId) {
        numToots ||= Storage_1.default.getConfig().numTootsInFirstFetch;
        const timelineLookBackMS = Storage_1.default.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
        const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
        const logPrefix = `[API ${types_1.StorageKey.HOME_TIMELINE}]`;
        const statuses = await this.fetchData({
            fetch: this.api.v1.timelines.home.list,
            label: types_1.StorageKey.HOME_TIMELINE,
            maxId: maxId,
            maxRecords: numToots || Storage_1.default.getConfig().maxTimelineTootsToFetch,
            skipCache: true,
            breakIf: (pageOfResults, allResults) => {
                const oldestTootAt = (0, toot_1.earliestTootedAt)(allResults) || new Date();
                const oldestTootAtStr = (0, time_helpers_1.quotedISOFmt)(oldestTootAt);
                const oldestInPageStr = (0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(pageOfResults));
                console.debug(`${logPrefix} oldest in page: ${oldestInPageStr}, oldest retrieved: ${oldestTootAtStr}`);
                if (oldestTootAt && oldestTootAt < cutoffTimelineAt) {
                    const cutoffStr = (0, time_helpers_1.quotedISOFmt)(cutoffTimelineAt);
                    console.log(`${logPrefix} Halting (oldestToot ${oldestTootAtStr} is before cutoff ${cutoffStr})`);
                    return true;
                }
                return false;
            }
        });
        const toots = await toot_1.default.buildToots(statuses);
        console.log(`${logPrefix} Retrieved ${toots.length} toots (oldest: ${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))})`);
        return toots;
    }
    ;
    async getBlockedAccounts() {
        const blockedAccounts = await this.fetchData({
            fetch: this.api.v1.blocks.list,
            label: types_1.StorageKey.BLOCKED_ACCOUNTS
        });
        return blockedAccounts.map(a => new account_1.default(a));
    }
    ;
    // Get toots for the top trending tags via the search endpoint.
    async getRecentTootsForTrendingTags() {
        const releaseMutex = await this.mutexes[types_1.StorageKey.TRENDING_TAG_TOOTS].acquire();
        const logPrefix = `[API ${types_1.StorageKey.TRENDING_TAG_TOOTS}]`;
        try {
            let trendingTagToots = await Storage_1.default.getToots(types_1.StorageKey.TRENDING_TAG_TOOTS);
            if (!trendingTagToots?.length || (await Storage_1.default.isDataStale(types_1.StorageKey.TRENDING_TAG_TOOTS))) {
                const trendingTags = await mastodon_server_1.default.fediverseTrendingTags();
                const tootTags = await Promise.all(trendingTags.map(tt => this.getTootsForTag(tt)));
                const toots = toot_1.default.dedupeToots(tootTags.flat(), types_1.StorageKey.TRENDING_TAG_TOOTS);
                toots.sort((a, b) => b.popularity() - a.popularity());
                trendingTagToots = toots.slice(0, Storage_1.default.getConfig().numTrendingTagsToots);
                await Storage_1.default.storeToots(types_1.StorageKey.TRENDING_TAG_TOOTS, trendingTagToots);
                console.log(`${logPrefix} Retrieved ${trendingTagToots.length} toots`, trendingTagToots);
            }
            else {
                console.debug(`${logPrefix} Loaded ${trendingTagToots.length} from cache`);
            }
            return trendingTagToots;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Get accounts the user is following
    async getFollowedAccounts() {
        const followedAccounts = await this.fetchData({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: types_1.StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: Storage_1.default.getConfig().maxFollowingAccountsToPull,
        });
        return followedAccounts.map(a => new account_1.default(a));
    }
    ;
    // Get hashtags the user is following
    async getFollowedTags() {
        const followedTags = await this.fetchData({
            fetch: this.api.v1.followedTags.list,
            label: types_1.StorageKey.FOLLOWED_TAGS
        });
        return (followedTags || []).map(tag_1.repairTag);
    }
    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts() {
        const mutedAccounts = await this.fetchData({
            fetch: this.api.v1.mutes.list,
            label: types_1.StorageKey.MUTED_ACCOUNTS
        });
        const blockedAccounts = await this.getBlockedAccounts();
        return mutedAccounts.map(a => new account_1.default(a)).concat(blockedAccounts);
    }
    ;
    // Get an array of Toots the user has recently favourited
    async getRecentFavourites() {
        const recentFaves = await this.fetchData({
            fetch: this.api.v1.favourites.list,
            label: types_1.StorageKey.FAVOURITED_ACCOUNTS
        });
        return recentFaves.map(t => new toot_1.default(t));
    }
    ;
    // Get the user's recent notifications
    async getRecentNotifications() {
        return await this.fetchData({
            fetch: this.api.v1.notifications.list,
            label: types_1.StorageKey.RECENT_NOTIFICATIONS
        });
    }
    // Retrieve content based feed filters the user has set up on the server
    // TODO: The generalized method this.fetchData() doesn't work here because it's a v2 endpoint
    async getServerSideFilters() {
        const releaseMutex = await this.mutexes[types_1.StorageKey.SERVER_SIDE_FILTERS].acquire();
        const logPrefix = `[API ${types_1.StorageKey.SERVER_SIDE_FILTERS}]`;
        try {
            let filters = await Storage_1.default.get(types_1.StorageKey.SERVER_SIDE_FILTERS);
            if (!filters || (await Storage_1.default.isDataStale(types_1.StorageKey.SERVER_SIDE_FILTERS))) {
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
                console.log(`${logPrefix} Retrieved records:`, filters);
            }
            else {
                console.debug(`${logPrefix} Loaded ${filters.length} recoreds from cache:`);
            }
            return filters;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Retrieve background data about the user that will be used for scoring etc.
    async getUserData() {
        // Use BLOCKED_ACCOUNTS as a stand in for all user data freshness
        const isDataStale = await Storage_1.default.isDataStale(types_1.StorageKey.BLOCKED_ACCOUNTS);
        if (this.userData && !isDataStale)
            return this.userData;
        const responses = await Promise.all([
            this.getFollowedAccounts(),
            this.getFollowedTags(),
            this.getMutedAccounts(),
            this.getServerSideFilters(),
        ]);
        // Cache a copy here instead of relying on browser storage because this is accessed quite a lot
        this.userData = {
            followedAccounts: account_1.default.buildAccountNames(responses[0]),
            followedTags: responses[1],
            mutedAccounts: account_1.default.buildAccountNames(responses[2]),
            serverSideFilters: responses[3],
        };
        console.debug(`[MastoApi] Constructed UserData object:`, this.userData);
        return this.userData;
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
    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot) {
        const tootURI = toot.realURI();
        const urlDomain = (0, string_helpers_1.extractDomain)(tootURI);
        const logPrefix = `[resolveToot()]`;
        console.debug(`${logPrefix} called for`, toot);
        if (urlDomain == this.homeDomain)
            return toot;
        const lookupResult = await this.api.v2.search.fetch({ q: tootURI, resolve: true });
        if (!lookupResult?.statuses?.length) {
            (0, string_helpers_1.logAndThrowError)(`${logPrefix} got bad result for '${tootURI}'`);
        }
        const resolvedStatus = lookupResult.statuses[0];
        console.debug(`${logPrefix} found resolvedStatus for '${tootURI}:`, resolvedStatus);
        return new toot_1.default(resolvedStatus);
    }
    ;
    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    //   - logMsg:        optional description of why the search is being run (for logging only)
    async searchForToots(searchStr, maxRecords, logMsg) {
        maxRecords = maxRecords || Storage_1.default.getConfig().defaultRecordsPerPage;
        const query = { limit: maxRecords, q: searchStr, type: exports.STATUSES };
        const logPrefix = `[searchForToots` + (logMsg ? ` (${logMsg})` : "") + `]`;
        const tootsForQueryMsg = `toots for query '${searchStr}'`;
        console.debug(`${logPrefix} fetching ${tootsForQueryMsg}...`);
        try {
            const searchResult = await this.api.v2.search.fetch(query);
            const toots = await toot_1.default.buildToots(searchResult.statuses);
            console.debug(`${logPrefix} Found ${toots.length} ${tootsForQueryMsg}`);
            return toots;
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} Failed to get ${tootsForQueryMsg}`);
            return [];
        }
    }
    ;
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    async searchForTootsByTag(searchStr, maxRecords) {
        maxRecords = maxRecords || Storage_1.default.getConfig().defaultRecordsPerPage;
        const logPrefix = `[searchForTootsByTag]`;
        console.log(`${logPrefix} searchForTootsByTag("${searchStr}", maxRecords=${maxRecords}) called`);
        try {
            const toots = await this.fetchData({
                fetch: this.api.v1.timelines.tag.$select(searchStr).list,
                label: types_1.StorageKey.TRENDING_TAG_TOOTS_V2,
                maxRecords: maxRecords,
                skipCache: true,
            });
            console.log(`${logPrefix} retrieved ${toots.length} toots for tag '#${searchStr}'`, toots);
            return await toot_1.default.buildToots(toots);
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} Failed to get toots for tag '#${searchStr}'`);
            return [];
        }
    }
    ;
    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    buildParams(maxId, limit) {
        limit ||= Storage_1.default.getConfig().defaultRecordsPerPage;
        let params = {
            limit: Math.min(limit, Storage_1.default.getConfig().defaultRecordsPerPage),
        };
        if (maxId)
            params = { ...params, maxId: `${maxId}` };
        return params;
    }
    ;
    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    async fetchData(fetchParams) {
        let { breakIf, fetch, label, maxId, maxRecords, skipCache } = fetchParams;
        breakIf = breakIf || DEFAULT_BREAK_IF;
        maxRecords ||= Storage_1.default.getConfig().minRecordsForFeatureScoring;
        const logPrefix = `[API ${label}]`;
        console.debug(`${logPrefix} fetchData() called (maxRecords=${maxRecords})`);
        const releaseFetchMutex = await this.mutexes[label].acquire();
        let results = [];
        let pageNumber = 0;
        try {
            if (!skipCache) {
                const cachedData = await Storage_1.default.get(label);
                if (cachedData && !(await Storage_1.default.isDataStale(label))) {
                    const rows = cachedData;
                    console.debug(`${logPrefix} Loaded ${rows.length} cached records`);
                    return rows;
                }
                ;
            }
            for await (const page of fetch(this.buildParams(maxId, maxRecords))) {
                results = results.concat(page);
                console.debug(`${logPrefix} Retrieved page ${++pageNumber}`);
                if (results.length >= maxRecords || breakIf(page, results)) {
                    console.debug(`${logPrefix} Halting fetch at page ${pageNumber} w/ ${results.length} records`);
                    break;
                }
            }
            console.log(`${logPrefix} Retrieved ${results.length} records:`, results);
            if (!skipCache)
                await Storage_1.default.set(label, results);
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} fetchData() for ${label} failed`);
            return results;
        }
        finally {
            releaseFetchMutex();
        }
        return results;
    }
    ;
    // Get latest toots for a given tag and populate trendingToots property
    // Currently uses both the Search API as well as the tag timeline API which have
    // surprising little overlap (~80% of toots are unique)
    async getTootsForTag(tag) {
        const numToots = Storage_1.default.getConfig().numTootsPerTrendingTag;
        const searchToots = await this.searchForToots(tag.name, numToots, 'trending tag');
        const tagTimelineToots = await this.searchForTootsByTag(tag.name, numToots);
        const logPrefix = `[${types_1.StorageKey.TRENDING_TAG_TOOTS} getTootsForTag("${tag.name}")]`;
        // TODO: this is excessive logging, remove it once we've had a chance to inspect results
        // searchToots.forEach(t => console.info(`${logPrefix} SEARCH found: ${t.describe()}`));
        // tagTimelineToots.forEach(t => console.info(`${logPrefix} TIMELINE found: ${t.describe()}`));
        logTrendingTagResults(logPrefix, "SEARCH", searchToots);
        logTrendingTagResults(logPrefix, "TIMELINE", tagTimelineToots);
        const allTagToots = [...searchToots, ...tagTimelineToots];
        return toot_1.default.dedupeToots(allTagToots, types_1.StorageKey.TRENDING_TAG_TOOTS_V2);
    }
    ;
    // Re-raise access revoked errors so they can trigger a logout() call
    throwIfAccessTokenRevoked(e, msg) {
        console.error(`${msg}. Error:`, e);
        if (!(e instanceof Error))
            return;
        if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
            throw e;
        }
    }
}
exports.MastoApi = MastoApi;
;
// TODO: get rid of this eventually
const logTrendingTagResults = (logPrefix, searchMethod, toots) => {
    let msg = `${logPrefix} ${(0, change_case_1.capitalCase)(searchMethod)} found ${toots.length} toots`;
    msg += ` (oldest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))}, newest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.mostRecentTootedAt)(toots))}):`;
    console.info(msg);
};
//# sourceMappingURL=api.js.map