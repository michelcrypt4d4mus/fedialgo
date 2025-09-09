"use strict";
/**
 * Namespace for Scorers that operate on a Toot independent of the rest of the feed.
 * @module toot_scorers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const scorer_1 = __importDefault(require("./scorer"));
const time_helpers_1 = require("../helpers/time_helpers");
/**
 * Base class for a {@linkcode Scorer} that can score a {@linkcode Toot} based solely on the properties of
 * that {@linkcode Toot}, optionally coupled with the fedialgo user's account data. Most importantly a
 * {@linkcode TootScorer} does *not* require information about any other {@linkcode Toot}s in the feed
 * (unlike a {@linkcode FeedScorer}, which requires knowledge of the entire timeline to render a score).
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class TootScorer extends scorer_1.default {
    constructor(scoreName) {
        super(scoreName);
    }
    /**
     * Calls {@linkcode TootScorer.prepareScoreData} to get any data required for scoring {@linkcode Toot} later.
     * NOTE: Don't overload this - {@linkcode prepareScoreData()} instead.
     */
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
            this.logger.debugWithTraceObjs(`prepareScoreData() finished ${(0, time_helpers_1.ageString)(startTime)}`, this.scoreData);
        }
        this.isReady = true;
    }
    /**
     * Can be overloaded in subclasses to set up any data required for scoring {@linkcode Toot}s.
     * @returns {StringNumberDict} Dictionary of data required for scoring {@linkcode Toot}s.
     */
    async prepareScoreData() {
        return {};
    }
}
exports.default = TootScorer;
;
//# sourceMappingURL=toot_scorer.js.map