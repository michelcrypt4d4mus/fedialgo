"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
const scorer_1 = __importDefault(require("./scorer"));
const time_helpers_1 = require("../helpers/time_helpers");
const environment_helpers_1 = require("../helpers/environment_helpers");
// TODO: Find a better name than "Feature" for this class
class FeatureScorer extends scorer_1.default {
    constructor(scoreName) {
        super(scoreName);
    }
    // Calls this.prepareScoreData() to get any data required for scoring Toots later.
    // Don't overload this - overload prepareScoreData() instead.
    async fetchRequiredData() {
        const startTime = Date.now();
        try {
            this.scoreData = await this.prepareScoreData();
        }
        catch (e) {
            this.logger.error(`Error in prepareScoreData():`, e);
            this.scoreData = {};
        }
        if (Object.values(this.scoreData).length > 0) {
            const msg = `(prepareScoreData()) finished ${(0, time_helpers_1.ageString)(startTime)}`;
            this.logger.debug(`${msg}, returned:`, environment_helpers_1.isDebugMode ? this.scoreData : `[enable debug mode to see]`);
        }
        this.isReady = true;
    }
    // Can be overloaded in subclasses to set up any data required for scoring Toots
    async prepareScoreData() {
        return {};
    }
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=feature_scorer.js.map