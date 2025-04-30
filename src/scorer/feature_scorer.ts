/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
import Scorer from "./scorer";
import { StringNumberDict, WeightName } from "../types";


// TODO: Find a better name than "Feature" for this class
export default abstract class FeatureScorer extends Scorer {
    constructor(scoreName: WeightName) {
        super(scoreName);
    }

    // Calls this.prepareScoreData() to get any data required for scoring Toots later.
    // Don't overload this - overload prepareScoreData() instead.
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

    // Can be overloaded in subclasses to set up any data required for scoring Toots
    async prepareScoreData(): Promise<StringNumberDict> {
        return {};
    }
};
