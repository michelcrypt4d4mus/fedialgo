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
/*
 * Class to wrap authenticated mastodon API calls to the user's home server (unauthenticated
 * calls are handled by MastodonServer).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
const change_case_1 = require("change-case");
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./objects/account"));
const mastodon_server_1 = __importDefault(require("./mastodon_server"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importStar(require("./objects/toot"));
const user_data_1 = __importDefault(require("./user_data"));
const collection_helpers_1 = require("../helpers/collection_helpers");
const string_helpers_1 = require("../helpers/string_helpers");
const time_helpers_1 = require("../helpers/time_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const types_1 = require("../types");
const tag_1 = require("./objects/tag");
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
    userData; // Preserve user data for the session in the object to avoid having to go to local storage over and over
    static #instance;
    mutexes;
    requestSemphore; // Semaphore to limit concurrent requests
    timelineLookBackMS; // How far back to look for toots in the home timeline
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
        this.timelineLookBackMS = Storage_1.default.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
        // Initialize mutexes for each key in Key and WeightName
        this.requestSemphore = new async_mutex_1.Semaphore(Storage_1.default.getConfig().maxConcurrentTootRequests);
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
        const logPrefix = `[API ${types_1.StorageKey.HOME_TIMELINE}]`;
        const cutoffAt = new Date(Date.now() - this.timelineLookBackMS);
        const statuses = await this.getApiRecords({
            fetch: this.api.v1.timelines.home.list,
            label: types_1.StorageKey.HOME_TIMELINE,
            maxId: maxId,
            maxRecords: numToots || Storage_1.default.getConfig().maxInitialTimelineToots,
            skipCache: true,
            breakIf: (_newPageOfResults, allResults) => {
                const oldestTootAt = (0, toot_1.earliestTootedAt)(allResults) || new Date();
                if (oldestTootAt && oldestTootAt <= cutoffAt) {
                    console.log(`${logPrefix} Halting (${(0, time_helpers_1.quotedISOFmt)(oldestTootAt)} <= ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)})`);
                    return true;
                }
                return false;
            }
        });
        const toots = await toot_1.default.buildToots(statuses, logPrefix);
        console.log(`${logPrefix} Retrieved ${toots.length} toots (oldest: ${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))})`);
        return toots;
    }
    ;
    async getBlockedAccounts() {
        const blockedAccounts = await this.getApiRecords({
            fetch: this.api.v1.blocks.list,
            label: types_1.StorageKey.BLOCKED_ACCOUNTS
        });
        return blockedAccounts.map(a => new account_1.default(a));
    }
    ;
    // Get accounts the user is following
    async getFollowedAccounts() {
        const followedAccounts = await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: types_1.StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: Storage_1.default.getConfig().maxFollowingAccountsToPull,
        });
        return followedAccounts.map(a => new account_1.default(a));
    }
    // Get hashtags the user is following
    async getFollowedTags() {
        const followedTags = await this.getApiRecords({
            fetch: this.api.v1.followedTags.list,
            label: types_1.StorageKey.FOLLOWED_TAGS
        });
        return (followedTags || []).map(tag_1.repairTag);
    }
    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts() {
        const mutedAccounts = await this.getApiRecords({
            fetch: this.api.v1.mutes.list,
            label: types_1.StorageKey.MUTED_ACCOUNTS
        });
        const blockedAccounts = await this.getBlockedAccounts();
        return mutedAccounts.map(a => new account_1.default(a)).concat(blockedAccounts);
    }
    // Get recent toots from hashtags the user has participated in
    async getParticipatedHashtagToots() {
        const fetch = async () => {
            let tags = await user_data_1.default.getPostedHashtagsSorted();
            // Exclude followed tags from the list (they will show up in the timeline on their own)
            const followedTags = await MastoApi.instance.getFollowedTags();
            tags = tags.filter(t => !followedTags.some(f => f.name == t.name));
            tags = (0, collection_helpers_1.truncateToConfiguredLength)(tags, "numUserParticipatedTagsToFetchTootsFor");
            return await this.getStatusesForTags(tags);
        };
        return await this.getCacheableToots(types_1.StorageKey.PARTICIPATED_HASHTAG_TOOTS, fetch, "numUserParticipatedTagToots");
    }
    // Get an array of Toots the user has recently favourited
    // https://docs.joinmastodon.org/methods/favourites/#get
    // IDs of accounts ar enot monotonic so there's not really any way to
    // incrementally load this endpoint (the only way is pagination)
    async getRecentFavourites(moar) {
        const recentFaves = await this.getApiRecords({
            fetch: this.api.v1.favourites.list,
            label: types_1.StorageKey.FAVOURITED_TOOTS,
            moar: moar,
        });
        (0, collection_helpers_1.checkUniqueIDs)(recentFaves, types_1.StorageKey.FAVOURITED_TOOTS);
        return recentFaves.map(t => new toot_1.default(t));
    }
    // Get the user's recent notifications
    async getRecentNotifications(moar) {
        const notifications = await this.getApiRecords({
            fetch: this.api.v1.notifications.list,
            label: types_1.StorageKey.RECENT_NOTIFICATIONS,
            moar: moar,
        });
        (0, collection_helpers_1.checkUniqueIDs)(notifications, types_1.StorageKey.RECENT_NOTIFICATIONS);
        return notifications;
    }
    // Get toots for the top trending tags via the search endpoint.
    async getRecentTootsForTrendingTags() {
        return await this.getCacheableToots(types_1.StorageKey.TRENDING_TAG_TOOTS, async () => this.getStatusesForTags(await mastodon_server_1.default.fediverseTrendingTags()), "numTrendingTagsToots");
    }
    ;
    // Retrieve content based feed filters the user has set up on the server
    // TODO: The generalized method this.fetchData() doesn't work here because it's a v2 endpoint
    async getServerSideFilters() {
        const logPrefix = `[API ${types_1.StorageKey.SERVER_SIDE_FILTERS}]`;
        const releaseMutex = await (0, log_helpers_1.lockMutex)(this.mutexes[types_1.StorageKey.SERVER_SIDE_FILTERS], logPrefix);
        const startTime = new Date();
        try {
            let filters = await Storage_1.default.get(types_1.StorageKey.SERVER_SIDE_FILTERS);
            if (filters && !(await Storage_1.default.isDataStale(types_1.StorageKey.SERVER_SIDE_FILTERS))) {
                console.debug(`${logPrefix} Loaded ${filters.length} recoreds from cache:`);
            }
            else {
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
                console.log(`${logPrefix} Retrieved ${filters.length} records ${(0, time_helpers_1.inSeconds)(startTime)}:`, filters);
            }
            return filters;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    // TODO: THESE HAVE NOT HAD Theire dependent properties set yet! maybe this whole function belongs in the other one above
    async getTootsForHashtag(searchStr, maxRecords) {
        maxRecords = maxRecords || Storage_1.default.getConfig().defaultRecordsPerPage;
        const startedAt = new Date();
        const [semaphoreNum, releaseSemaphore] = await this.requestSemphore.acquire();
        const logPrefix = `[getTootsForHashtag()] (semaphore ${semaphoreNum})`;
        try {
            const toots = await this.getApiRecords({
                fetch: this.api.v1.timelines.tag.$select(searchStr).list,
                label: types_1.StorageKey.TRENDING_TAG_TOOTS_V2,
                maxRecords: maxRecords,
                skipCache: true,
                skipMutex: true,
            });
            console.debug(`${logPrefix} Retrieved ${toots.length} '#${searchStr}' toots ${(0, time_helpers_1.inSeconds)(startedAt)}`);
            return toots;
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} Failed to get '#${searchStr}' ${(0, time_helpers_1.inSeconds)(startedAt)}`);
            return [];
        }
        finally {
            releaseSemaphore();
        }
    }
    ;
    // Retrieve background data about the user that will be used for scoring etc.
    // Caches as an instance variable so the storage doesn't have to be hit over and over
    async getUserData() {
        // TODO: the staleness check probably belongs in the UserData class
        if (!this.userData || (await this.userData.isDataStale())) {
            this.userData = await user_data_1.default.getUserData();
        }
        return this.userData;
    }
    ;
    // Get the user's recent toots
    // NOTE: the user's own Toots don't have setDependentProperties() called on them!
    async getUserRecentToots(moar) {
        const recentToots = await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: types_1.StorageKey.RECENT_USER_TOOTS,
            moar: moar,
        });
        (0, collection_helpers_1.checkUniqueIDs)(recentToots, types_1.StorageKey.RECENT_USER_TOOTS);
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
        const lookupResult = await this.api.v2.search.list({ q: tootURI, resolve: true });
        if (!lookupResult?.statuses?.length) {
            (0, log_helpers_1.logAndThrowError)(`${logPrefix} got bad result for '${tootURI}'`, lookupResult);
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
    async searchForToots(searchStr, maxRecords) {
        maxRecords = maxRecords || Storage_1.default.getConfig().defaultRecordsPerPage;
        const query = { limit: maxRecords, q: searchStr, type: exports.STATUSES };
        const startTime = new Date();
        const [semaphoreNum, releaseSemaphore] = await this.requestSemphore.acquire();
        const logPrefix = `[searchForToots(${searchStr})] (semaphore ${semaphoreNum})`;
        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            console.debug(`${logPrefix} Retrieved ${statuses.length} ${(0, time_helpers_1.inSeconds)(startTime)}`);
            return statuses;
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} Failed to fetch ${(0, time_helpers_1.inSeconds)(startTime)}`);
            return [];
        }
        finally {
            releaseSemaphore();
        }
    }
    ;
    // Get URL for the tag on the user's homeserver
    tagURL(tag) {
        return `${this.endpointURL(exports.TAGS)}/${tag.name}`;
    }
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
    // Generic data getter for things we want to cache but require custom fetch logic
    //    - maxRecordsConfigKey: optional config key to use to truncate the number of records returned
    async getCacheableToots(key, fetch, maxRecordsConfigKey) {
        const logPrefix = `[API getCacheableToots ${key}]`;
        const releaseMutex = await (0, log_helpers_1.lockMutex)(this.mutexes[key], logPrefix);
        const startedAt = new Date();
        try {
            let toots = await Storage_1.default.getToots(key);
            if (!toots || (await Storage_1.default.isDataStale(key))) {
                const statuses = await fetch();
                console.debug(`${logPrefix} Retrieved ${statuses.length} toots ${(0, time_helpers_1.inSeconds)(startedAt)}`);
                toots = await toot_1.default.buildToots(statuses, logPrefix);
                if (maxRecordsConfigKey) {
                    toots = (0, collection_helpers_1.truncateToConfiguredLength)(toots, maxRecordsConfigKey);
                }
                await Storage_1.default.storeToots(key, toots);
            }
            else {
                (0, log_helpers_1.traceLog)(`${logPrefix} Loaded ${toots.length} cached toots ${(0, time_helpers_1.inSeconds)(startedAt)}`);
            }
            return toots;
        }
        finally {
            releaseMutex();
        }
    }
    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    async getApiRecords(fetchParams) {
        fetchParams.maxRecords ||= Storage_1.default.getConfig().minRecordsForFeatureScoring;
        fetchParams.breakIf ||= DEFAULT_BREAK_IF;
        let { breakIf, fetch, label, maxId, maxRecords, moar, skipCache, skipMutex } = fetchParams;
        const logPfx = `[API ${label}]`;
        (0, log_helpers_1.traceLog)(`${logPfx} fetchData() called w/params:`, fetchParams);
        if (moar && (skipCache || maxId))
            console.warn(`${logPfx} skipCache=true AND moar or maxId set`);
        const releaseFetchMutex = skipMutex ? null : await (0, log_helpers_1.lockMutex)(this.mutexes[label], logPfx);
        const startedAt = new Date();
        let pageNumber = 0;
        let rows = [];
        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedRows = await Storage_1.default.get(label);
                if (cachedRows && !(await Storage_1.default.isDataStale(label))) {
                    (0, log_helpers_1.traceLog)(`${logPfx} Loaded ${rows.length} cached rows ${(0, time_helpers_1.inSeconds)(startedAt)}`);
                    if (!moar)
                        return cachedRows;
                    // IF MOAR!!!! then we want to find the minimum ID in the cached data and do a fetch from that point
                    console.log(`${logPfx} Found ${cachedRows?.length} cached rows, using minId to fetch more`);
                    rows = cachedRows;
                    maxRecords = maxRecords + rows.length; // Add another unit of maxRecords to # of rows we have now
                    maxId = (0, collection_helpers_1.findMinId)(rows);
                    console.log(`${logPfx} Found min ID ${maxId} in cache to use as maxId request param`);
                }
                ;
            }
            const parms = this.buildParams(maxId, maxRecords);
            (0, log_helpers_1.traceLog)(`${logPfx} Fetching with params:`, parms);
            for await (const page of fetch(parms)) {
                rows = rows.concat(page);
                pageNumber += 1;
                const recordsSoFar = `have ${rows.length} records so far ${(0, time_helpers_1.inSeconds)(startedAt)}`;
                if (rows.length >= maxRecords || breakIf(page, rows)) {
                    let msg = `${logPfx} Completing fetch at page ${pageNumber}`;
                    (0, log_helpers_1.traceLog)(`${msg}, ${recordsSoFar}`);
                    break;
                }
                else {
                    (0, log_helpers_1.traceLog)(`${logPfx} Retrieved page ${pageNumber} (${recordsSoFar})`);
                }
            }
            if (!skipCache)
                await Storage_1.default.set(label, rows);
        }
        catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPfx} fetchData() for ${label} failed ${(0, time_helpers_1.inSeconds)(startedAt)}`);
            return rows;
        }
        finally {
            releaseFetchMutex && releaseFetchMutex();
        }
        return rows;
    }
    ;
    // Get latest toots for a given tag and populate trendingToots property
    // Currently uses both the Search API as well as the tag timeline API which have
    // surprising little overlap (~80% of toots are unique)
    async getStatusesForTag(tagName, numToots) {
        numToots ||= Storage_1.default.getConfig().numTootsPerTrendingTag;
        const tagToots = await Promise.all([
            this.searchForToots(tagName, numToots),
            this.getTootsForHashtag(tagName, numToots),
        ]);
        // TODO: this is excessive logging, remove it once we've had a chance to inspect results
        // searchToots.forEach(t => console.info(`${logPrefix} SEARCH found: ${t.describe()}`));
        // tagTimelineToots.forEach(t => console.info(`${logPrefix} TIMELINE found: ${t.describe()}`));
        // logTrendingTagResults(logPrefix, "SEARCH", searchToots);
        // logTrendingTagResults(logPrefix, "TIMELINE", tagTimelineToots);
        return tagToots.flat();
    }
    ;
    // Collect and fully populate / dedup a collection of toots for an array of Tags
    // Sorts toots by poplularity and returns them.
    async getStatusesForTags(tags) {
        const tagToots = await Promise.all(tags.map(tag => this.getStatusesForTag(tag.name)));
        return tagToots.flat();
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
    endpointURL(endpoint) {
        return `https://${this.homeDomain}/${endpoint}`;
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