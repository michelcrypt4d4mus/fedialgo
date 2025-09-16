"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTrendingRankToAvg = exports.uniquifyTrendingObjs = exports.decorateTagHistory = exports.decorateLinkHistory = void 0;
const collection_helpers_1 = require("../../helpers/collection_helpers");
const config_1 = require("../../config");
const tag_1 = require("./tag");
const string_helpers_1 = require("../../helpers/string_helpers");
/**
 * Decorate a Mastodon {@linkcode https://docs.joinmastodon.org/entities/PreviewCard/#trends-link TrendLink}
 * with computed history data, adding {@linkcode numToots} & {@linkcode numAccounts} properties.
 * @param {mastodon.v1.TrendLink} link - The TrendLink object to decorate.
 * @returns {TrendingLink} The decorated TrendingLink object.
 */
function decorateLinkHistory(link) {
    const newLink = link;
    newLink.regex = (0, string_helpers_1.wordRegex)(newLink.url);
    return decorateHistoryScores(newLink);
}
exports.decorateLinkHistory = decorateLinkHistory;
;
/**
 * Decorate a mastodon {@linkcode https://docs.joinmastodon.org/entities/PreviewCard/#trends-link Tag} with
 * computed history data, adding {@linkcode numToots} & {@linkcode numAccounts} properties.
 * @param {Hashtag} tag - The Tag object to decorate.
 * @returns {TagWithUsageCounts} The decorated Tag object.
 */
function decorateTagHistory(tag) {
    const newTag = tag;
    (0, tag_1.repairTag)(newTag);
    return decorateHistoryScores(newTag);
}
exports.decorateTagHistory = decorateTagHistory;
;
/**
 * Return one of each unique trending object sorted by the number of accounts tooting that object.
 * The {@linkcode numToots} & {@linkcode numAccounts} props for each trending object are set to
 * the max value encountered.
 * @param {T[]} trendingObjs - Array of trending objects to uniquify.
 * @param {(obj: T) => string} uniqueKey - Function that returns the key to use for uniqueness.
 * @returns {T[]} Array of unique trending objects sorted by {@linkcode numAccounts}.
*/
function uniquifyTrendingObjs(trendingObjs, uniqueKey) {
    const urlObjs = trendingObjs.reduce((unique, obj) => {
        const key = uniqueKey(obj).toLowerCase();
        if (unique[key]) {
            unique[key].numAccounts = Math.max(unique[key].numAccounts || 0, obj.numAccounts || 0);
            unique[key].numToots = Math.max(unique[key].numToots || 0, obj.numToots || 0);
        }
        else {
            unique[key] = obj;
        }
        return unique;
    }, {});
    // TODO: should this sort by numToots too instead? Usually we sort things by numToots but here we want to sort by numAccounts
    const sortedObjs = Object.values(urlObjs).sort((a, b) => (b.numAccounts || 0) - (a.numAccounts || 0));
    return sortedObjs;
}
exports.uniquifyTrendingObjs = uniquifyTrendingObjs;
;
/**
 * A toot can trend on multiple servers in which case we set trendingRank for all to the avg
 * // TODO: maybe we should add the # of servers to the avg?
 * @param {Toot[]} rankedToots - Array of toots with trendingRank set.
 */
function setTrendingRankToAvg(rankedToots) {
    const tootsByURI = (0, collection_helpers_1.groupBy)(rankedToots, toot => toot.realURI);
    Object.values(tootsByURI).forEach((uriToots) => {
        const avgScore = (0, collection_helpers_1.average)(uriToots.map(t => t.realToot.trendingRank));
        uriToots.forEach((toot) => toot.trendingRank = avgScore);
    });
}
exports.setTrendingRankToAvg = setTrendingRankToAvg;
;
/**
 * Add {@linkcode numToots} & {@linkcode numAccounts} to the trending object by summing
 * {@linkcode config.trending.daysToCountTrendingData} of 'history'.
 * @template T
 * @param {T} obj - The trending object to decorate.
 * @returns {T} The decorated trending object.
 */
function decorateHistoryScores(obj) {
    obj.url = obj.url.toLowerCase().trim(); // TODO: not ideal for this to happen here
    if (!obj.history?.length) {
        console.warn(`decorateHistoryScores() found no history for:`, obj);
        obj.history = [];
    }
    const recentHistory = obj.history.slice(0, config_1.config.trending.daysToCountTrendingData);
    obj.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    obj.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    return obj;
}
;
//# sourceMappingURL=trending_with_history.js.map