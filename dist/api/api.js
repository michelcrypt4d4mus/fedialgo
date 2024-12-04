"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRecentToots = exports.getMonthlyUsers = exports.mastodonFetchPages = exports.mastodonFetch = exports.searchForToots = exports.DEFAULT_RECORDS_PER_PAGE = void 0;
/*
 * Helper methods for using mastodon API.
 */
const axios_1 = __importDefault(require("axios"));
const change_case_1 = require("change-case");
const helpers_1 = require("../helpers");
// Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
exports.DEFAULT_RECORDS_PER_PAGE = 40;
const DEFAULT_MIN_RECORDS_FOR_FEATURE = 400;
const SERVER_MAU_ENDPOINT = "api/v2/instance";
// Use the API to search for recent toots containing a 'searchQuery' string
async function searchForToots(api, searchQuery, limit = exports.DEFAULT_RECORDS_PER_PAGE) {
    console.debug(`[searchForToots] getting toots for query '${searchQuery}'`);
    const mastoQuery = { limit: limit, q: searchQuery, type: "statuses" };
    try {
        const searchResult = await api.v2.search.fetch(mastoQuery);
        const toots = searchResult.statuses;
        console.debug(`[searchForToots] Found toots for query`, mastoQuery);
        return toots;
    }
    catch (e) {
        console.warn(`[searchForToots] Failed to get toots for query '${searchQuery}':`, e);
        return [];
    }
}
exports.searchForToots = searchForToots;
;
// Retrieve Mastodon server information from a given server and endpoint
const mastodonFetch = async (server, endpoint) => {
    const url = `https://${server}${endpoint}`;
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
    catch (error) {
        console.warn(`Error fetching data for server ${server} from endpoint '${endpoint}'`, error);
        return;
    }
};
exports.mastodonFetch = mastodonFetch;
;
async function mastodonFetchPages(fetchParams) {
    let { fetchMethod, maxRecords, label } = fetchParams;
    maxRecords ||= DEFAULT_MIN_RECORDS_FOR_FEATURE;
    label ||= "unknown";
    console.debug(`mastodonFetchPages() for ${label} w/ maxRecords=${maxRecords}, fetchMethod:`, fetchMethod);
    let results = [];
    let pageNumber = 0;
    try {
        for await (const page of fetchMethod({ limit: exports.DEFAULT_RECORDS_PER_PAGE })) {
            results = results.concat(page);
            console.log(`Retrieved page ${++pageNumber} of current user's ${label}...`);
            if (results.length >= maxRecords) {
                console.log(`Halting record retrieval at page ${pageNumber} w/ ${results.length} records...`);
                break;
            }
        }
    }
    catch (e) {
        console.error(`Error in mastodonFetchPages():`, e);
        return results;
    }
    return results;
}
exports.mastodonFetchPages = mastodonFetchPages;
;
// Get publicly available MAU information. Requires no login (??)
async function getMonthlyUsers(server) {
    try {
        const instance = await (0, exports.mastodonFetch)(server, SERVER_MAU_ENDPOINT);
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    }
    catch (error) {
        console.warn(`Error in getMonthlyUsers() for server ${server}:`, error);
        return 0;
    }
}
exports.getMonthlyUsers = getMonthlyUsers;
;
// Get the user's recent toots
function getUserRecentToots(api, user) {
    return mastodonFetchPages({
        fetchMethod: api.v1.accounts.$select(user.id).statuses.list,
        label: 'recentToots'
    });
}
exports.getUserRecentToots = getUserRecentToots;
;
//# sourceMappingURL=api.js.map