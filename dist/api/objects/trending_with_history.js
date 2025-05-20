"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTrendingRankToAvg = exports.uniquifyTrendingObjs = exports.decorateHistoryScores = void 0;
const collection_helpers_1 = require("../../helpers/collection_helpers");
const config_1 = require("../../config");
// Add numToots & numAccounts to the trending object by summing numDaysToCountTrendingTagData of 'history'
function decorateHistoryScores(_obj) {
    const obj = _obj;
    obj.url = obj.url.toLowerCase(); // TODO: not ideal for this to happen here
    if (!obj.history?.length) {
        console.warn(`decorateHistoryScores() found no history for:`, obj);
        obj.history = [];
    }
    const recentHistory = obj.history.slice(0, config_1.Config.trending.tags.numDaysToCountTrendingTagData);
    obj.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    obj.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
}
exports.decorateHistoryScores = decorateHistoryScores;
;
// Return one of each unique trending object sorted by the number of accounts tooting that object.
// The numToots & numAccounts props for each trending object are set to the max value encountered.
function uniquifyTrendingObjs(trendingObjs, uniqueKey) {
    const urlObjs = trendingObjs.reduce((unique, obj) => {
        const key = uniqueKey(obj).toLowerCase();
        if (unique[key]) {
            unique[key].numToots = Math.max(unique[key].numToots || 0, obj.numToots || 0);
            unique[key].numAccounts = Math.max(unique[key].numAccounts || 0, obj.numAccounts || 0);
        }
        else {
            unique[key] = obj;
        }
        return unique;
    }, {});
    const sortedObjs = Object.values(urlObjs).sort((a, b) => (b.numAccounts || 0) - (a.numAccounts || 0));
    return sortedObjs;
}
exports.uniquifyTrendingObjs = uniquifyTrendingObjs;
;
// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
// TODO: maybe rename this file 'trending_helpers.ts' or similar since Toots don't have a trending history
function setTrendingRankToAvg(rankedToots) {
    const tootsByURI = (0, collection_helpers_1.groupBy)(rankedToots, toot => toot.realURI());
    Object.values(tootsByURI).forEach((uriToots) => {
        const avgScore = (0, collection_helpers_1.average)(uriToots.map(t => t.realToot().trendingRank));
        uriToots.forEach((toot) => {
            toot.trendingRank = avgScore;
            if (toot.reblog) {
                toot.reblog.trendingRank = avgScore;
                console.warn(`[setTrendingRankToAvg] Setting reblog (???) rank to ${avgScore}:`, toot);
            }
        });
    });
}
exports.setTrendingRankToAvg = setTrendingRankToAvg;
;
//# sourceMappingURL=trending_with_history.js.map