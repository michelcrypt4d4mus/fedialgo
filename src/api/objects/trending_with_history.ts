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

import type Toot from "./toot";
import { average, groupBy } from "../../helpers/collection_helpers";
import { config } from "../../config";
import { repairTag } from "./tag";
import { wordRegex } from "../../helpers/string_helpers";
import {
    type Hashtag,
    type TagWithUsageCounts,
    type TrendingLink,
    type TrendingWithHistory
} from "../../types";


// Decorate a Mastodon TrendLink with computed history data, adding numToots & numAccounts
export function decorateLinkHistory(link: mastodon.v1.TrendLink): TrendingLink {
    const newLink = link as TrendingLink;
    newLink.regex = wordRegex(newLink.url);
    return decorateHistoryScores(newLink);
};


// Decorate a mastodon tag with computed history data, adding numToots & numAccounts
export function decorateTagHistory(tag: Hashtag): TagWithUsageCounts {
    const newTag = tag as TagWithUsageCounts;
    repairTag(newTag);
    return decorateHistoryScores(newTag);
};


// Return one of each unique trending object sorted by the number of accounts tooting that object.
// The numToots & numAccounts props for each trending object are set to the max value encountered.
export function uniquifyTrendingObjs<T extends TrendingWithHistory>(
    trendingObjs: T[],
    uniqueKey: (obj: T) => string
): T[] {
    const urlObjs = trendingObjs.reduce((unique, obj) => {
        const key = uniqueKey(obj).toLowerCase();

        if (unique[key]) {
            unique[key].numAccounts = Math.max(unique[key].numAccounts || 0, obj.numAccounts || 0);
            unique[key].numToots = Math.max(unique[key].numToots || 0, obj.numToots || 0);
        } else {
            unique[key] = obj;
        }

        return unique;
    }, {} as Record<string, TrendingWithHistory>);

    // TODO: should this sort by numToots too instead? Usually we sort things by numToots but here we want to sort by numAccounts
    const sortedObjs = Object.values(urlObjs).sort((a, b) => (b.numAccounts || 0) - (a.numAccounts || 0));
    return sortedObjs as T[];
};


// A toot can trend on multiple servers in which case we set trendingRank for all to the avg
// TODO: maybe we should add the # of servers to the avg?
export function setTrendingRankToAvg(rankedToots: Toot[]): void {
    const tootsByURI = groupBy<Toot>(rankedToots, toot => toot.realURI);

    Object.values(tootsByURI).forEach((uriToots) => {
        const avgScore = average(uriToots.map(t => t.realToot.trendingRank) as number[]);
        uriToots.forEach((toot) => toot.trendingRank = avgScore);
    });
};


// Add numToots & numAccounts to the trending object by summing daysToCountTrendingData of 'history'
function decorateHistoryScores<T extends TrendingWithHistory>(obj: T): T {
    obj.url = obj.url.toLowerCase().trim();  // TODO: not ideal for this to happen here

    if (!obj.history?.length) {
        console.warn(`decorateHistoryScores() found no history for:`, obj);
        obj.history = [];
    }

    const recentHistory = obj.history.slice(0, config.trending.daysToCountTrendingData);
    obj.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    obj.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    return obj;
};
