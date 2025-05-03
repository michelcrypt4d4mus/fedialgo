/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
import Scorer from "./scorer";
import { inSeconds } from "../helpers/time_helpers";
import { StringNumberDict, WeightName } from "../types";


// TODO: Find a better name than "Feature" for this class
export default abstract class FeatureScorer extends Scorer {
    constructor(scoreName: WeightName) {
        super(scoreName);
    }

    // Calls this.prepareScoreData() to get any data required for scoring Toots later.
    // Don't overload this - overload prepareScoreData() instead.
    async fetchRequiredData(): Promise<void> {
        const startTime = Date.now();

        try {
            this.scoreData = await this.prepareScoreData();
        } catch (e) {
            console.error(`${this.logPrefix()} Error in prepareScoreData():`, e);
            this.scoreData = {};
        }

        this.isReady = true;
        let msg = `${this.logPrefix()} TELEMETRY prepareScoreData() finished ${inSeconds(startTime)}`;

        if (Object.values(this.scoreData).length > 0) {
            console.debug(`${msg}, returned:`, this.scoreData);
        }
    }

    // Can be overloaded in subclasses to set up any data required for scoring Toots
    async prepareScoreData(): Promise<StringNumberDict> {
        return {};
    }
};
