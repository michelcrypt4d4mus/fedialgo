/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
import { mastodon } from "masto";

import Scorer from "./scorer";
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { StringNumberDict, TrendingWithHistory, WeightName } from "../types";


// TODO: Find a better name than "Feature" for this class
export default abstract class FeatureScorer extends Scorer {
    constructor(scoreName: WeightName) {
        super(scoreName);
    }

    // Can be overloaded in subclasses to set up any data required for scoring Toots
    async prepareScoreData(): Promise<StringNumberDict> {
        return {};
    }

    async fetchRequiredData(): Promise<void> {
        try {
            this.scoreData = await this.prepareScoreData();
        } catch (e) {
            console.error(`${this.logPrefix()} Error in prepareScoreData():`, e);
            this.scoreData = {};
        }

        if (Object.values(this.scoreData).length > 0) {
            console.debug(`${this.logPrefix()} prepareScoreData() returned:`, this.scoreData);
        }

        this.isReady = true;
    }

    // Add numToots & numAccounts to the trending object by summing numDaysToCountTrendingTagData of 'history'
    static decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): void {
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
    static uniquifyTrendingObjs<T>(
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
    }
};
