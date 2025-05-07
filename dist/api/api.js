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
exports.TAGS = exports.STATUSES = exports.LINKS = exports.INSTANCE = void 0;
/*
 * Singleton class to wrap authenticated mastodon API calls to the user's home server
 * (unauthenticated calls are handled by the MastodonServer class).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
const change_case_1 = require("change-case");
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./objects/account"));
const Storage_1 = __importStar(require("../Storage"));
const toot_1 = __importStar(require("./objects/toot"));
const user_data_1 = __importDefault(require("./user_data"));
const time_helpers_1 = require("../helpers/time_helpers");
const types_1 = require("../types");
const config_1 = require("../config");
const string_helpers_1 = require("../helpers/string_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const tag_1 = require("./objects/tag");
exports.INSTANCE = "instance";
exports.LINKS = "links";
exports.STATUSES = "statuses";
exports.TAGS = "tags";
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const DEFAULT_BREAK_IF = async (pageOfResults, allResults) => undefined;
;
class MastoApi {
    static #instance; // Singleton instance of MastoApi
    api;
    homeDomain;
    user;
    userData; // Save UserData in the API object to avoid polling local storage over and over
    mutexes;
    requestSemphore; // Semaphore to limit concurrent requests
    // Helper methods
    tagURL = (tag) => `${this.endpointURL(exports.TAGS)}/${tag.name}`; // URL for tag on the user's homeserver
    endpointURL = (endpoint) => `https://${this.homeDomain}/${endpoint}`;
    static init(api, user) {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }
        console.log(`[API] Initializing MastoApi instance with user:`, user.acct);
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
        // Initialize mutexes for each StorageKey and a Semaphore for concurrent requests
        this.mutexes = {};
        for (const key in types_1.StorageKey)
            this.mutexes[types_1.StorageKey[key]] = new async_mutex_1.Mutex();
        this.requestSemphore = new async_mutex_1.Semaphore(config_1.Config.maxConcurrentRequestsInitial);
    }
    ;
    // Get the user's home timeline feed (recent toots from followed accounts and hashtags).
    // Pagination starts at the most recent toots and goes backwards in time.
    //    - mergeTootsToFeed: fxn to call to merge the fetched toots into the feed
    //    - numToots:         maximum number of toots to fetch
    //    - maxTootedAt:      optional date to use as the cutoff (stop fetch if we find older toots)
    //    - maxId:            optional maxId to start the fetch from
    // TODO: should probably be a mutex on this...
    async fetchHomeFeed(mergeTootsToFeed, maxRecords, maxTootedAt, // Home timeline most recent toot date
    maxId) {
        const logPrefix = `[API ${types_1.StorageKey.HOME_TIMELINE}]`;
        let homeTimelineToots = await Storage_1.default.getCoerced(types_1.StorageKey.HOME_TIMELINE);
        maxTootedAt ||= (0, toot_1.mostRecentTootedAt)(homeTimelineToots);
        const cutoffAt = (0, time_helpers_1.mostRecent)((0, time_helpers_1.timelineCutoffAt)(), maxTootedAt ?? null);
        console.debug(`${logPrefix} maxTootedAt: ${(0, time_helpers_1.quotedISOFmt)(maxTootedAt)}, maxId: ${maxId}, cutoffAt: ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)}`);
        let oldestTootStr = "no oldest toot";
        const startedAt = new Date();
        let allNewToots = [];
        // getApiRecords() returns Toots that haven't had completeProperties() called on them
        // which we don't use because breakIf() calls mergeTootsToFeed() on each page of results
        const _incompleteToots = await this.getApiRecords({
            fetch: this.api.v1.timelines.home.list,
            storageKey: types_1.StorageKey.HOME_TIMELINE,
            maxId: maxId,
            maxRecords: maxRecords,
            skipCache: true,
            breakIf: async (newStatuses, allStatuses) => {
                const oldestTootAt = (0, toot_1.earliestTootedAt)(newStatuses);
                if (!oldestTootAt) {
                    console.warn(`${logPrefix} No new statuses in page, stopping fetch`);
                    return true;
                }
                oldestTootStr = `oldest toot: ${(0, time_helpers_1.quotedISOFmt)(oldestTootAt)}`;
                console.debug(`${logPrefix} Got ${newStatuses.length} new toots, ${allStatuses.length} total (${oldestTootStr})`);
                const newToots = await toot_1.default.buildToots(newStatuses, types_1.StorageKey.HOME_TIMELINE);
                await mergeTootsToFeed(newToots, logPrefix);
                allNewToots = allNewToots.concat(newToots);
                // Break the toot fetching loop if we encounter a toot older than cutoffAt
                if (oldestTootAt < cutoffAt) {
                    console.log(`${logPrefix} Halting fetch (${oldestTootStr} <= cutoff ${(0, time_helpers_1.quotedISOFmt)(cutoffAt)})`);
                    return true;
                }
            }
        });
        homeTimelineToots = toot_1.default.dedupeToots([...allNewToots, ...homeTimelineToots], types_1.StorageKey.HOME_TIMELINE);
        let msg = `${logPrefix} Fetched ${allNewToots.length} new toots ${(0, time_helpers_1.ageString)(startedAt)} (${oldestTootStr}`;
        console.debug(`${msg}, home feed has ${homeTimelineToots.length} toots)`);
        await Storage_1.default.set(types_1.StorageKey.HOME_TIMELINE, homeTimelineToots);
        return homeTimelineToots;
    }
    ;
    async getBlockedAccounts() {
        return await this.getApiRecords({
            fetch: this.api.v1.blocks.list,
            storageKey: types_1.StorageKey.BLOCKED_ACCOUNTS
        });
    }
    ;
    // Get accounts the user is following
    async getFollowedAccounts() {
        const accounts = await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            storageKey: types_1.StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: config_1.Config.maxFollowingAccountsToPull,
        });
        // const accountsByWebfinger = accounts.filter(a => !!a.webfingerURI);
        // console.log(`[getFollowedAccounts() ${StorageKey.FOLLOWED_ACCOUNTS}] found ${accounts.length} accounts with ${accountsByWebfinger.length} webfingerURIs`, accounts);
        return accounts;
    }
    // Get hashtags the user is following
    async getFollowedTags() {
        const followedTags = await this.getApiRecords({
            fetch: this.api.v1.followedTags.list,
            storageKey: types_1.StorageKey.FOLLOWED_TAGS
        });
        return followedTags.map(tag_1.repairTag);
    }
    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts() {
        const mutedAccounts = await this.getApiRecords({
            fetch: this.api.v1.mutes.list,
            storageKey: types_1.StorageKey.MUTED_ACCOUNTS
        });
        const blockedAccounts = await this.getBlockedAccounts();
        return mutedAccounts.concat(blockedAccounts);
    }
    // Get an array of Toots the user has recently favourited
    // https://docs.joinmastodon.org/methods/favourites/#get
    // IDs of accounts ar enot monotonic so there's not really any way to
    // incrementally load this endpoint (the only way is pagination)
    async getRecentFavourites(moar) {
        return await this.getApiRecords({
            fetch: this.api.v1.favourites.list,
            storageKey: types_1.StorageKey.FAVOURITED_TOOTS,
            // moar: moar,
        });
    }
    // Get the user's recent notifications
    async getRecentNotifications(moar) {
        return await this.getApiRecords({
            fetch: this.api.v1.notifications.list,
            storageKey: types_1.StorageKey.RECENT_NOTIFICATIONS,
            moar: moar,
        });
    }
    // Get the user's recent toots
    // NOTE: the user's own Toots don't have completeProperties() called on them!
    async getRecentUserToots(moar) {
        return await this.getApiRecords({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            storageKey: types_1.StorageKey.RECENT_USER_TOOTS,
            moar: moar,
        });
    }
    ;
    // Retrieve content based feed filters the user has set up on the server
    // TODO: this.getApiRecords() doesn't work here because endpoint doesn't paginate the same way
    async getServerSideFilters() {
        const logPrefix = `[API ${types_1.StorageKey.SERVER_SIDE_FILTERS}]`;
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mutexes[types_1.StorageKey.SERVER_SIDE_FILTERS], logPrefix);
        const startTime = new Date();
        try {
            let filters = await Storage_1.default.getIfNotStale(types_1.StorageKey.SERVER_SIDE_FILTERS);
            if (!filters) {
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
                console.log(`${logPrefix} Retrieved ${filters.length} records ${(0, time_helpers_1.ageString)(startTime)}:`, filters);
                await Storage_1.default.set(types_1.StorageKey.SERVER_SIDE_FILTERS, filters);
            }
            return filters;
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Get latest toots for a given tag using both the Search API and tag timeline API.
    // The two APIs give results with surprising little overlap (~80% of toots are unique)
    async getStatusesForTag(tag, numToots) {
        numToots ||= config_1.Config.numTootsPerTrendingTag;
        const tagToots = await Promise.all([
            this.searchForToots(tag.name, numToots),
            this.hashtagTimelineToots(tag, numToots),
        ]);
        logTrendingTagResults(`[#${tag.name}]`, "both", tagToots.flat());
        return tagToots.flat();
    }
    // Collect and fully populate / dedup a collection of toots for an array of Tags
    async getStatusesForTags(tags, numTootsPerTag) {
        console.log(`[getStatusesForTags()] called for ${tags.length} tags:`, tags.map(t => t.name));
        const tagToots = await Promise.all(tags.map(tag => this.getStatusesForTag(tag, numTootsPerTag)));
        return tagToots.flat();
    }
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
        return toot_1.default.build(resolvedStatus);
    }
    ;
    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    async searchForToots(searchStr, maxRecords) {
        maxRecords = maxRecords || config_1.Config.defaultRecordsPerPage;
        let logPrefix = `[API searchForToots("${searchStr}")]`;
        const releaseSemaphore = await (0, log_helpers_1.lockExecution)(this.requestSemphore, logPrefix);
        const query = { limit: maxRecords, q: searchStr, type: exports.STATUSES };
        logPrefix += ` (semaphore)`;
        const startedAt = new Date();
        try {
            const searchResult = await this.api.v2.search.list(query);
            const statuses = searchResult.statuses;
            console.debug(`${logPrefix} Retrieved ${statuses.length} ${(0, time_helpers_1.ageString)(startedAt)}`);
            return statuses;
        }
        catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${(0, time_helpers_1.ageString)(startedAt)}`);
            return [];
        }
        finally {
            releaseSemaphore();
        }
    }
    ;
    // Generic data getter for things we want to cache but require custom fetch logic
    //    - maxRecordsConfigKey: optional config key to use to truncate the number of records returned
    async getCacheableToots(key, fetch, maxRecordsConfigKey) {
        const logPrefix = `[API getCacheableToots ${key}]`;
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mutexes[key], logPrefix);
        const startedAt = new Date();
        try {
            let toots = await Storage_1.default.getIfNotStale(key);
            if (!toots) {
                const statuses = await fetch();
                console.debug(`${logPrefix} Retrieved ${statuses.length} Status objects ${(0, time_helpers_1.ageString)(startedAt)}`);
                toots = await toot_1.default.buildToots(statuses, maxRecordsConfigKey.replace(/^num/, ""), logPrefix);
                if (maxRecordsConfigKey) {
                    toots = (0, collection_helpers_1.truncateToConfiguredLength)(toots, maxRecordsConfigKey);
                }
                await Storage_1.default.set(key, toots);
            }
            return toots;
        }
        finally {
            releaseMutex();
        }
    }
    // After the initial load we don't need to have massive concurrency and in fact it can be a big resource
    // drain switching back to the browser window, which triggers a lot of background requests
    // TODO: should this call this.requestSemphore.setValue() instead? https://www.npmjs.com/package/async-mutex
    setSemaphoreConcurrency(concurrency) {
        console.log(`[MastoApi] Setting semaphore to background concurrency to ${concurrency}`);
        this.requestSemphore = new async_mutex_1.Semaphore(concurrency);
    }
    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    async getApiRecords(fetchParams) {
        // Parameter setup
        let logPfx = `[API ${fetchParams.storageKey}]`;
        fetchParams.breakIf ??= DEFAULT_BREAK_IF;
        fetchParams.maxRecords ??= config_1.Config.minRecordsForFeatureScoring;
        let { breakIf, fetch, storageKey: label, maxId, maxRecords, moar, skipCache, skipMutex } = fetchParams;
        if (moar && (skipCache || maxId))
            console.warn(`${logPfx} skipCache=true AND moar or maxId set`);
        (0, log_helpers_1.traceLog)(`${logPfx} fetchData() params:`, fetchParams);
        // Skip mutex for requests that aren't trying to get at the same data
        const releaseMutex = skipMutex ? null : await (0, log_helpers_1.lockExecution)(this.mutexes[label], logPfx);
        const startedAt = new Date();
        let pageNumber = 0;
        let rows = [];
        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedRows = await Storage_1.default.getIfNotStale(label);
                if (cachedRows) {
                    if (!moar)
                        return cachedRows; // Return cached data unless moar=true
                    // IF MOAR!!!! then we want to find the minimum ID in the cached data and do a fetch from that point
                    // TODO: a bit janky of an approach... we could maybe use the min/max_id param in normal request
                    rows = cachedRows;
                    maxRecords = maxRecords + rows.length; // Add another unit of maxRecords to # of rows we have now
                    maxId = (0, collection_helpers_1.findMinId)(rows);
                    console.log(`${logPfx} Found min ID ${maxId} in cache to use as maxId request param`);
                }
                ;
            }
            // buildParams will coerce maxRecords down to the max per page if it's larger
            for await (const page of fetch(this.buildParams(maxId, maxRecords, logPfx))) {
                rows = rows.concat(page);
                pageNumber += 1;
                const shouldStop = await breakIf(page, rows); // Must be called before we check the length of rows!
                const recordsSoFar = `have ${rows.length} records so far ${(0, time_helpers_1.ageString)(startedAt)}`;
                if (rows.length >= maxRecords || shouldStop) {
                    (0, log_helpers_1.traceLog)(`${logPfx} Completing fetch at page ${pageNumber}, ${recordsSoFar}`);
                    break;
                }
                else {
                    (0, log_helpers_1.traceLog)(`${logPfx} Retrieved page ${pageNumber} (${recordsSoFar})`);
                }
            }
        }
        catch (e) {
            // If the access token was not revoked whatever rows we've retrieved will be returned
            MastoApi.throwIfAccessTokenRevoked(e, `${logPfx} Failed ${(0, time_helpers_1.ageString)(startedAt)}, have ${rows.length} rows`);
        }
        finally {
            releaseMutex?.();
        }
        const objs = MastoApi.buildFromApiObjects(label, rows);
        if (!skipCache)
            await Storage_1.default.set(label, objs);
        return objs;
    }
    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    async hashtagTimelineToots(tag, maxRecords) {
        maxRecords = maxRecords || config_1.Config.defaultRecordsPerPage;
        let logPrefix = `[hashtagTimelineToots("#${tag.name}")]`;
        const releaseSemaphore = await (0, log_helpers_1.lockExecution)(this.requestSemphore, logPrefix);
        logPrefix += ` (semaphore)`;
        const startedAt = new Date();
        try {
            const toots = await this.getApiRecords({
                fetch: this.api.v1.timelines.tag.$select(tag.name).list,
                storageKey: types_1.StorageKey.HASHTAG_TOOTS,
                maxRecords: maxRecords,
                skipCache: true,
                skipMutex: true,
            });
            console.debug(`${logPrefix} Retrieved ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
            return toots;
        }
        catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Failed ${(0, time_helpers_1.ageString)(startedAt)}`);
            return [];
        }
        finally {
            releaseSemaphore();
        }
    }
    ;
    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    buildParams(maxId, limitPerPage, logPfx) {
        limitPerPage ||= config_1.Config.defaultRecordsPerPage;
        let params = {
            limit: Math.min(limitPerPage, config_1.Config.defaultRecordsPerPage),
        };
        if (maxId)
            params = { ...params, maxId: `${maxId}` };
        if (logPfx)
            (0, log_helpers_1.traceLog)(`${logPfx} Fetching with params:`, params);
        return params;
    }
    ;
    // Construct an Account or Toot object from the API object (otherwise just return the object)
    static buildFromApiObjects(key, objects) {
        if (Storage_1.STORAGE_KEYS_WITH_ACCOUNTS.includes(key)) {
            return objects.map(o => account_1.default.build(o));
        }
        else if (Storage_1.STORAGE_KEYS_WITH_TOOTS.includes(key)) {
            return objects.map(o => toot_1.default.build(o));
        }
        else {
            return objects;
        }
    }
    // Re-raise access revoked errors so they can trigger a logout() cal otherwise just log and move on
    static throwIfAccessTokenRevoked(e, msg) {
        console.error(`${msg}. Error:`, e);
        if (!(e instanceof Error)) {
            console.warn(`${msg} - Error is not an instance of Error:`, e);
            return;
        }
        if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
            throw e;
        }
    }
}
exports.default = MastoApi;
;
// TODO: get rid of this eventually
const logTrendingTagResults = (logPrefix, searchMethod, toots) => {
    let msg = `${logPrefix} ${(0, change_case_1.capitalCase)(searchMethod)} found ${toots.length} toots`;
    msg += ` (oldest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.earliestTootedAt)(toots))}, newest=${(0, time_helpers_1.quotedISOFmt)((0, toot_1.mostRecentTootedAt)(toots))}):`;
    console.info(msg);
};
//# sourceMappingURL=api.js.map