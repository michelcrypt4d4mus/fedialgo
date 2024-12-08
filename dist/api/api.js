"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTootsForTag = exports.getUserRecentToots = exports.getMonthlyUsers = exports.mastodonFetchPages = exports.mastodonFetch = exports.searchForToots = exports.MastoApi = exports.FILTER_ENDPOINT = exports.ACCESS_TOKEN_REVOKED_MSG = void 0;
/*
 * Helper methods for using mastodon API.
 */
const axios_1 = __importDefault(require("axios"));
const change_case_1 = require("change-case");
const home_feed_1 = __importDefault(require("../feeds/home_feed"));
const trending_tags_1 = __importDefault(require("../feeds/trending_tags"));
const trending_toots_1 = __importDefault(require("../feeds/trending_toots"));
const mastodon_api_cache_1 = __importDefault(require("./mastodon_api_cache"));
const Storage_1 = __importDefault(require("../Storage"));
const helpers_1 = require("../helpers");
exports.ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const API_URI = "api";
const API_V1 = `${API_URI}/v1`;
const API_V2 = `${API_URI}/v2`;
const SERVER_MAU_ENDPOINT = `${API_V2}/instance`;
exports.FILTER_ENDPOINT = `${API_V2}/filters`;
class MastoApi {
    api;
    constructor(api) {
        this.api = api;
    }
    // Retrieve background data about the user that will be used for scoring etc.
    async getStartupData() {
        const responses = await Promise.all([
            mastodon_api_cache_1.default.getFollowedAccounts(this.api),
            mastodon_api_cache_1.default.getFollowedTags(this.api),
            mastodon_api_cache_1.default.getServerSideFilters(this.api),
        ]);
        return {
            followedAccounts: responses[0],
            followedTags: responses[1],
            serverSideFilters: responses[2],
        };
    }
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
}
exports.MastoApi = MastoApi;
;
// Use the API to search for recent toots containing a 'searchQuery' string
async function searchForToots(api, searchQuery, limit = null) {
    limit = limit || Storage_1.default.getConfig().defaultRecordsPerPage;
    console.debug(`[searchForToots] getting toots for query '${searchQuery}'`);
    const mastoQuery = { limit: limit, q: searchQuery, type: "statuses" };
    try {
        const searchResult = await api.v2.search.fetch(mastoQuery);
        const toots = searchResult.statuses;
        console.debug(`[searchForToots] Found toots for query`, mastoQuery);
        return toots;
    }
    catch (e) {
        throwIfAccessTokenRevoked(e, `Failed to get toots for query '${searchQuery}'`);
        return [];
    }
}
exports.searchForToots = searchForToots;
;
// Retrieve Mastodon server information from a given server and endpoint
const mastodonFetch = async (server, endpoint, limit = null) => {
    let url = `https://${server}${endpoint}`;
    if (limit)
        url += `?limit=${limit}`;
    console.debug(`mastodonFetch() ${url}'...`);
    try {
        const json = await axios_1.default.get(url);
        console.debug(`mastodonFetch() response for ${url}:`, json);
        if (json.status === 200 && json.data) {
            return (0, helpers_1.transformKeys)(json.data, change_case_1.camelCase);
        }
        else {
            throw json;
        }
    }
    catch (e) {
        console.warn(`Error fetching data for server ${server} from endpoint '${endpoint}'`, e);
        return;
    }
};
exports.mastodonFetch = mastodonFetch;
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
// Get publicly available MAU information. Requires no login (??)
async function getMonthlyUsers(server) {
    if (Storage_1.default.getConfig().noMauServers.some(s => server.startsWith(s))) {
        console.debug(`monthlyUsers() for '${server}' is not available`);
        return 0;
    }
    try {
        const instance = await (0, exports.mastodonFetch)(server, SERVER_MAU_ENDPOINT);
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    }
    catch (error) {
        console.warn(`Error in getMonthlyUsers() for server ${server}`, error);
        return 0;
    }
}
exports.getMonthlyUsers = getMonthlyUsers;
;
// Get the user's recent toots
async function getUserRecentToots(api, user) {
    const recentToots = await mastodonFetchPages({
        fetch: api.v1.accounts.$select(user.id).statuses.list,
        label: 'recentToots'
    });
    return recentToots;
}
exports.getUserRecentToots = getUserRecentToots;
;
// Get latest toots for a given tag
async function getTootsForTag(api, tag) {
    try {
        // TODO: this doesn't append a an octothorpe to the tag name. Should it?
        const toots = await searchForToots(api, tag.name, Storage_1.default.getConfig().numTootsPerTrendingTag);
        // Inject the tag into each toot as a trendingTag element
        toots.forEach((toot) => {
            toot.trendingTags ||= [];
            toot.trendingTags.push(tag);
        });
        console.debug(`Found toots for tag '${tag.name}':`, toots);
        return toots;
    }
    catch (e) {
        throwIfAccessTokenRevoked(e, `Failed to get toots for tag '${tag.name}'`);
        return [];
    }
}
exports.getTootsForTag = getTootsForTag;
;
// re-raise access revoked errors.
function throwIfAccessTokenRevoked(e, msg) {
    console.error(`${msg}. Error:`, e);
    if (!(e instanceof Error))
        return;
    if (e.message.includes(exports.ACCESS_TOKEN_REVOKED_MSG)) {
        throw e;
    }
}
;
//# sourceMappingURL=api.js.map