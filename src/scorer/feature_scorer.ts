/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
import { mastodon } from "masto";

import Scorer from "./scorer";
import Storage from "../Storage";
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
};
