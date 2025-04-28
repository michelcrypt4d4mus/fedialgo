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
    requiredData: StringNumberDict = {};

    constructor(scoreName: WeightName) {
        super(scoreName);
    }

    // Can be overloaded in subclasses to retrieve feature data from the server
    async featureGetter(): Promise<StringNumberDict> {
        return {};
    }

    async fetchRequiredData(): Promise<Toot[]> {
        try {
            this.requiredData = await this.featureGetter();
        } catch (e) {
            console.error(`Error in featureGetter() for ${this.constructor.name}:`, e);
            this.requiredData = {};
        }

        console.log(`[${this.constructor.name}] featureGetter() returned:`, this.requiredData);
        this.isReady = true;
        return [];  // this is a hack so we can safely use Promise.all().flat() to pull startup data
    }

    // Add numToots & numAccounts to the trending object by summing numDaysToCountTrendingTagData of 'history'
    static decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): void {
        const obj = _obj as TrendingWithHistory;
        obj.url = obj.url.toLowerCase();

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
    static uniquifyTrendingObjs(
        trendingObjs: TrendingWithHistory[],
        uniqueKey: (obj: TrendingWithHistory) => string
    ): TrendingWithHistory[] {
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

        return Object.values(urlObjs).sort((a, b) => (b.numAccounts || 0) - (a.numAccounts || 0));
    }
};
