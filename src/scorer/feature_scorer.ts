/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
import Scorer from "./scorer";
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { StringNumberDict, TrendingLink, TrendingTag, WeightName } from "../types";
import { mastodon } from "masto";


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

    async getFeature(): Promise<Toot[]> {
        try {
            this.requiredData = await this.featureGetter();
        } catch (e) {
            console.warn(`Error in getFeature() for ${this.name}:`, e);
        }

        console.log(`${this.constructor.name} featureGetter() returned:`, this.requiredData);
        this.isReady = true;
        return [];  // this is a hack so we can safely use Promise.all().flat() to pull startup data
    }

    // Add numToots and numAccounts to the TrendingLink or TrendingTag object
    static decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): TrendingLink | TrendingTag {
        // obj = obj.type == "link" ? obj as TrendingLink : obj as TrendingTag;
        const obj = _obj as TrendingLink | TrendingTag;
        obj.url = obj.url.toLowerCase();

        if (!obj?.history?.length) {
            console.warn(`decorateHistoryScores() found no history for:`, obj);
            obj.history = [];
        }

        const recentHistory = obj.history.slice(0, Storage.getConfig().numDaysToCountTrendingTagData);
        obj.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
        obj.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
        return obj;
    };
};
