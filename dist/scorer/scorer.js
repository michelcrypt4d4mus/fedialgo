"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @fileoverview Base class for {@linkcode Toot} scorers.
 */
const async_mutex_1 = require("async-mutex");
const lodash_1 = require("lodash");
const scorer_cache_1 = __importDefault(require("./scorer_cache"));
const Storage_1 = __importDefault(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
const config_1 = require("../config");
const weight_presets_1 = require("./weight_presets");
const logger_1 = require("../helpers/logger");
const enums_1 = require("../enums");
// Local constants
const LOG_PREFIX = "Scorer";
const SCORE_MUTEX = new async_mutex_1.Mutex();
const TRENDING_WEIGHTS = new Set([
    enums_1.ScoreName.TRENDING_LINKS,
    enums_1.ScoreName.TRENDING_TAGS,
    enums_1.ScoreName.TRENDING_TOOTS,
]);
const scoreLogger = new logger_1.Logger(LOG_PREFIX, "scoreToots");
/**
 * Abstract base class for scoring {@linkcode Toot} objects.
 *
 * {@linkcode Scorer} implementations provide algorithms for assigning scores to {@linkcode Toot}s,
 * which are used for ranking and filtering feeds. This class manages scorer state, logging, and
 * provides a public API for scoring, as well as static utilities for scoring arrays of {@linkcode Toot}s.
 *
 * @abstract
 * @property {string} description - Description of the scoring algorithm.
 * @property {boolean} isReady - True if the scorer is ready to score toots.
 * @property {Logger} logger - Logger instance for this scorer.
 * @property {ScoreName} name - The name/key of this scorer.
 * @property {StringNumberDict} scoreData - Background data used to score a toot.
 */
class Scorer {
    isReady = false; // Set to true when the scorer is ready to score
    logger;
    name;
    scoreData = {}; // Background data used to score a toot
    /**
     * @param {ScoreName} name - The name/key of this scorer.
     */
    constructor(name) {
        this.name = name;
        this.logger = new logger_1.Logger(LOG_PREFIX, name);
    }
    /**
     * Returns a WeightInfo object with the description of the scorer.
     * @returns {WeightInfo} The weight info for this scorer.
     */
    getInfo() {
        return { description: this.description };
    }
    /** Resets the scorer's state and score data. */
    reset() {
        this.isReady = false;
        this.scoreData = {};
        this.logger.debug(`Reset scorer`);
    }
    /**
     * Public API for scoring a {@linkcode Toot}. Returns the score, or 0 if not ready.
     * @param {Toot} toot - The toot to score.
     * @returns {Promise<number>} The computed score for the toot.
     */
    async score(toot) {
        if (this.isReady) {
            return await this._score(toot);
        }
        else if (toot.scoreInfo) {
            const existingScore = toot.getIndividualScore("raw", this.name);
            this.logger.deep(`Not ready but toot already scored ${existingScore}`);
            return existingScore;
        }
        else {
            this.logger.deep(`Not ready and no existing scoreInfo, scoring 0...`);
            return 0;
        }
    }
    //////////////////////////////
    //   Static class methods   //
    //////////////////////////////
    /**
     * Scores and returns an array of {@linkcode Toot}s sorted by score (descending). Does NOT mutate the input
     * array! If you need the sorted array you need to use the return value.
     * @static
     * @param {Toot[]} toots - Array of toots to score.
     * @param {boolean} [isScoringFeed] - If true, refreshes feed scorer data and locks scoring.
     * @returns {Promise<Toot[]>} Array of scored and sorted toots.
     */
    static async scoreToots(toots, isScoringFeed) {
        const scorers = scorer_cache_1.default.weightedScorers;
        const startedAt = new Date();
        try {
            let releaseMutex;
            // Feed scorers' data must be refreshed each time the main timeline feed changes so we half heartedly
            // lock mutex to prevent multiple scoring loops calling DiversityFeedScorer simultaneously.
            // If it's already locked just cancel the current loop and start over (scoring is idempotent so it's OK).
            // Makes the feed scoring more responsive to the user adjusting the weights (less waiting).
            if (isScoringFeed) {
                SCORE_MUTEX.cancel();
                releaseMutex = await SCORE_MUTEX.acquire();
                scorer_cache_1.default.feedScorers.forEach(scorer => scorer.extractScoreDataFromFeed(toots));
            }
            try { // Score the toots asynchronously in batches
                await (0, collection_helpers_1.batchMap)(toots, t => this.decorateWithScoreInfo(t, scorers), { logger: scoreLogger });
            }
            finally {
                releaseMutex?.();
            }
            // Sort feed based on score from high to low and return
            scoreLogger.trace(`Scored ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)} (${scorers.length} scorers)`);
            toots = toots.toSorted((a, b) => b.score - a.score);
        }
        catch (e) {
            if (e == async_mutex_1.E_CANCELED) {
                scoreLogger.trace(`Mutex cancellation...`);
            }
            else {
                scoreLogger.warn(`Caught error:`, e);
            }
        }
        return toots;
    }
    /**
     * Validates that the {@linkcode weights} object contains valid weight names and values.
     * Throws an error if any weight is invalid or missing.
     * @static
     * @param {Weights} weights - Weights object to validate.
     * @throws {Error} If any weight is invalid or missing.
     */
    static validateWeights(weights) {
        Object.entries(weights).forEach(([weightName, value]) => {
            if (!(0, enums_1.isWeightName)(weightName))
                throw new Error(`Invalid weight name: ${weightName}`);
            if (!(0, lodash_1.isFinite)(value))
                throw new Error(`Weight ${weightName} is missing from weights object!`);
            if ((0, enums_1.isNonScoreWeightName)(weightName) && weightName != enums_1.NonScoreWeightName.TRENDING && value <= 0) {
                throw new Error(`Non-score weight ${weightName} must be greater than 0!`);
            }
        });
    }
    ////////////////////////////////
    //   Private static methods   //
    ////////////////////////////////
    /**
     * Adds all score info to a {@linkcode Toot}'s {@linkcode scoreInfo} property.
     * @private
     * @static
     * @param {Toot} toot - The toot to decorate.
     * @param {Scorer[]} scorers - Array of scorer instances.
     * @returns {Promise<void>}
     */
    static async decorateWithScoreInfo(toot, scorers) {
        const rawestScores = await Promise.all(scorers.map((s) => s.score(toot)));
        // Find non scorer weights
        const userWeights = await Storage_1.default.getWeights();
        const getWeight = (weightKey) => userWeights[weightKey] ?? weight_presets_1.DEFAULT_WEIGHTS[weightKey];
        const timeDecayWeight = getWeight(enums_1.NonScoreWeightName.TIME_DECAY) / 10; // Divide by 10 to make it more user friendly
        const trendingMultiplier = getWeight(enums_1.NonScoreWeightName.TRENDING);
        let outlierDampener = getWeight(enums_1.NonScoreWeightName.OUTLIER_DAMPENER);
        if (outlierDampener <= 0) {
            scoreLogger.warn(`Outlier dampener is ${outlierDampener} but should not be less than 0! Using 1 instead.`);
            outlierDampener = 1; // Prevent division by zero
        }
        // Compute a weighted score for a toot by multiplying the value of each scorable property's numeric
        // score by the user's chosen weighting (the one configured with the GUI sliders) for that property.
        const scores = scorers.reduce((scoreDict, scorer, i) => {
            const rawScore = rawestScores[i] || 0;
            const outlierExponent = 1 / outlierDampener;
            let weightedScore = rawScore * (userWeights[scorer.name] ?? 0);
            // Apply the TRENDING modifier
            if (TRENDING_WEIGHTS.has(scorer.name)) {
                weightedScore *= trendingMultiplier;
            }
            // Outlier dampener of 2 means take the square root of the score, 3 means cube root, etc.
            if (weightedScore >= 0) {
                weightedScore = Math.pow(weightedScore, outlierExponent);
            }
            else {
                weightedScore = -1 * Math.pow(-1 * weightedScore, outlierExponent);
            }
            scoreDict[scorer.name] = { raw: rawScore, weighted: weightedScore };
            return scoreDict;
        }, {});
        // Multiple weighted score by time decay penalty to get a final weightedScore
        const decayExponent = -1 * Math.pow(toot.ageInHours, config_1.config.scoring.timeDecayExponent);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, decayExponent);
        const weightedScore = this.sumScores(scores, "weighted");
        const score = weightedScore * timeDecayMultiplier;
        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        const scoreInfo = {
            rawScore: this.sumScores(scores, "raw"),
            score,
            scores,
            timeDecayMultiplier,
            trendingMultiplier,
            weightedScore,
        };
        // TODO: duping the score to realToot is a hack that sucks
        toot.realToot.scoreInfo = toot.scoreInfo = scoreInfo;
    }
    /**
     * Sums the scores of all scorers for a given score type, +1 so that time decay multiplier
     * works even with scorers giving 0s.
     * @private
     * @static
     * @param {TootScores} scores - The scores object.
     * @param {ScoreType} scoreType - The type of score to sum ("raw" or "weighted").
     * @returns {number} The sum of the scores plus 1.
     */
    static sumScores(scores, scoreType) {
        return 1 + (0, collection_helpers_1.sumArray)(Object.values(scores).map((s) => s[scoreType]));
    }
}
exports.default = Scorer;
;
//# sourceMappingURL=scorer.js.map