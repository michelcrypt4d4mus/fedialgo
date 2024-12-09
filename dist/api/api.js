"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwIfAccessTokenRevoked = exports.mastodonFetchPages = exports.MastoApi = void 0;
const home_feed_1 = __importDefault(require("../feeds/home_feed"));
const trending_tags_1 = __importDefault(require("../feeds/trending_tags"));
const trending_toots_1 = __importDefault(require("../feeds/trending_toots"));
const mastodon_api_cache_1 = __importDefault(require("./mastodon_api_cache"));
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const STATUSES = "statuses";
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
class MastoApi {
    static #instance;
    api;
    user;
    static init(api, user) {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }
        MastoApi.#instance = new MastoApi(api, user);
    }
    static get instance() {
        if (!MastoApi.#instance)
            throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    }
    constructor(api, user) {
        this.api = api;
        this.user = user;
    }
    // Retrieve background data about the user that will be used for scoring etc.
    async getStartupData() {
        const responses = await Promise.all([
            mastodon_api_cache_1.default.getFollowedAccounts(this.api),
            mastodon_api_cache_1.default.getFollowedTags(this.api),
            this.getServerSideFilters(),
        ]);
        return {
            followedAccounts: responses[0],
            followedTags: responses[1],
            serverSideFilters: responses[2],
        };
    }
    // Get the user's recent toots
    // TODO: the args are unused hangover from pre-singleton era
    async getUserRecentToots(_api, _user) {
        const recentToots = await mastodonFetchPages({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: 'recentToots'
        });
        return recentToots.map(t => new toot_1.default(t));
    }
    ;
    // TODO: the args are unused hangover from pre-singleton era
    async fetchFollowedAccounts(_api, _user) {
        return await mastodonFetchPages({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            maxRecords: Storage_1.default.getConfig().maxFollowingAccountsToPull,
            label: 'followedAccounts'
        });
    }
    ;
    // Get the toots that make up the user's home timeline feed
    async getFeed(numTimelineToots, maxId) {
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
        let homeToots = allResponses.shift();
        return {
            homeToots: homeToots,
            otherToots: allResponses.flat(),
        };
    }
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
    static v1Url = (path) => `${API_V1}/${path}`;
    static v2Url = (path) => `${API_V2}/${path}`;
    static trendUrl = (path) => this.v1Url(`trends/${path}`);
}
exports.MastoApi = MastoApi;
;
;
async function mastodonFetchPages(fetchParams) {
    let { fetch, maxRecords, label } = fetchParams;
    maxRecords ||= Storage_1.default.getConfig().minRecordsForFeatureScoring;
    label ||= "unknown";
    console.debug(`mastodonFetchPages() for ${label} w/ maxRecords=${maxRecords}, fetch:`, fetch);
    let results = [];
    let pageNumber = 0;
    try {
        for await (const page of fetch({ limit: Storage_1.default.getConfig().defaultRecordsPerPage })) {
            results = results.concat(page);
            console.log(`Retrieved page ${++pageNumber} of current user's ${label}...`);
            if (results.length >= maxRecords) {
                console.log(`Halting record retrieval at page ${pageNumber} w/ ${results.length} records...`);
                break;
            }
        }
    }
    catch (e) {
        throwIfAccessTokenRevoked(e, `mastodonFetchPages() for ${label} failed`);
        return results;
    }
    return results;
}
exports.mastodonFetchPages = mastodonFetchPages;
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