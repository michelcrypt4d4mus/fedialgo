/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
import Scorer from "./scorer";
import { ageString } from "../helpers/time_helpers";
import { isDebugMode } from "../helpers/environment_helpers";
import { ScoreName, StringNumberDict } from "../types";


// TODO: Find a better name than "Feature" for this class
export default abstract class FeatureScorer extends Scorer {
    constructor(scoreName: ScoreName) {
        super(scoreName);
    }

    // Calls this.prepareScoreData() to get any data required for scoring Toots later.
    // Don't overload this - overload prepareScoreData() instead.
    async fetchRequiredData(): Promise<void> {
        const startTime = Date.now();

        try {
            this.scoreData = await this.prepareScoreData();
        } catch (e) {
            this.logger.error(`Error in prepareScoreData():`, e);
            this.scoreData = {};
        }

        if (Object.values(this.scoreData).length > 0) {
            const msg = `(prepareScoreData()) finished ${ageString(startTime)}`;
            this.logger.debug(`${msg}, returned:`, isDebugMode ? this.scoreData : `[enable debug mode to see]`);
        }

        this.isReady = true;
    }

    // Can be overloaded in subclasses to set up any data required for scoring Toots
    async prepareScoreData(): Promise<StringNumberDict> {
        return {};
    }
};
