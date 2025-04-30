/*
 * Methods for dealing with trending link and tag objects and the history data they come with.
 *
 * Example mastodon.v1.TrendLink:
 *   {
 *       "name": "southkorea",
 *       "url": "https://journa.host/tags/southkorea",
 *       "history": [
 *           {
 *               "day": "1733184000",
 *               "accounts": "125",
 *               "uses": "374"
 *           },
 *           {
 *               "day": "1733097600",
 *               "accounts": "4",
 *               "uses": "146"
 *           },
 *           <...snip, usually 7 days of info...>
 *       ]
 *   }
 */
import { mastodon } from "masto";

import Storage from "../../Storage";
import { TrendingWithHistory } from "../../types";
import { groupBy, average } from "../../helpers/collection_helpers";
import Toot from "./toot";


// Add numToots & numAccounts to the trending object by summing numDaysToCountTrendingTagData of 'history'
export function decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): void {
    const obj = _obj as TrendingWithHistory;
    obj.url = obj.url.toLowerCase();  // TODO: not ideal for this to happen here

    if (!obj.history?.length) {
        console.warn(`decorateHistoryScores() found no history for:`, obj);
        obj.history = [];
    }

    const recentHistory = obj.history.slice(0, Storage.getConfig().numDaysToCountTrendingTagData);
    obj.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    obj.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
};


// Return one of each unique trending object sorted by the number of accounts tooting that object.
// The numToots & numAccounts props for each trending object are set to the max value encountered.
export function uniquifyTrendingObjs<T>(
    trendingObjs: TrendingWithHistory[],
    uniqueKey: (obj: TrendingWithHistory) => string
): T[] {
    const urlObjs = trendingObjs.reduce((unique, obj) => {
        const key = uniqueKey(obj).toLowerCase();

        if (unique[key]) {
            unique[key].numToots = Math.max(unique[key].numToots || 0, obj.numToots || 0);
            unique[key].numAccounts = Math.max(unique[key].numAccounts || 0, obj.numAccounts || 0);
        } else {
            unique[key] = obj;
        }

        return unique;
    }, {} as Record<string, TrendingWithHistory>);

    const sortedObjs = Object.values(urlObjs).sort((a, b) => (b.numAccounts || 0) - (a.numAccounts || 0));
    return sortedObjs as T[];
};


// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
// TODO: maybe rename this file 'trending_helpers.ts' or similar since Toots don't have a trending history
export function setTrendingRankToAvg(rankedToots: Toot[]): void {
    const tootsTrendingOnMultipleServers = groupBy<Toot>(rankedToots, toot => toot.uri);

    Object.entries(tootsTrendingOnMultipleServers).forEach(([_uri, toots]) => {
        const avgScore = average(toots.map(t => t.reblog?.trendingRank || t.trendingRank) as number[]);

        toots.forEach((toot) => {
            toot.trendingRank = avgScore;

            if (toot.reblog) {
                toot.reblog.trendingRank = avgScore;
                console.log(`[setTrendingRankToAvg] for reblog to ${avgScore}:`, toot);
            }
        });
    });
};
