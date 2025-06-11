"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for Toot scorers.
 */
const async_mutex_1 = require("async-mutex");
const lodash_1 = require("lodash");
const logger_1 = __importDefault(require("../helpers/logger"));
const scorer_cache_1 = __importDefault(require("./scorer_cache"));
const Storage_1 = __importDefault(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
const config_1 = require("../config");
const weight_presets_1 = require("./weight_presets");
const enums_1 = require("../enums");
// Local constants
const LOG_PREFIX = "Scorer";
const SCORE_MUTEX = new async_mutex_1.Mutex();
const TRENDING_WEIGHTS = new Set([
    enums_1.ScoreName.TRENDING_LINKS,
    enums_1.ScoreName.TRENDING_TAGS,
    enums_1.ScoreName.TRENDING_TOOTS,
]);
const scoreLogger = new logger_1.default(LOG_PREFIX, "scoreToots");
class Scorer {
    isReady = false; // Set to true when the scorer is ready to score
    logger;
    name;
    scoreData = {}; // Background data used to score a toot
    constructor(name) {
        this.name = name;
        this.logger = new logger_1.default(LOG_PREFIX, name);
    }
    // Return a ScorerInfo object with the description and the scorer itself
    getInfo() {
        return {
            description: this.description,
            scorer: this,
        };
    }
    reset() {
        this.isReady = false;
        this.scoreData = {};
        this.logger.debug(`Reset scorer`);
    }
    // This is the public API for scoring a toot
    async score(toot) {
        if (this.isReady)
            return await this._score(toot);
        if (!toot.scoreInfo) {
            this.logger.trace(`Not ready, scoring 0...`);
            return 0;
        }
        else {
            const existingScore = toot.getIndividualScore("raw", this.name);
            this.logger.trace(`Not ready but toot already scored (existing score: ${existingScore})`);
            return existingScore;
        }
    }
    //////////////////////////////
    //   Static class methods   //
    //////////////////////////////
    // Score and return an array of toots sorted by score. This DOES NOT mutate the order of
    // 'toots' array in place - if you need the sorted array you need to assign the return value.
    // If 'isScoringFeed' is false the scores will be "best effort"
    static async scoreToots(toots, isScoringFeed) {
        const scorers = scorer_cache_1.default.weightedScorers;
        const startedAt = new Date();
        try {
            // Lock mutex to prevent multiple scoring loops calling DiversityFeedScorer simultaneously.
            // If it's already locked just cancel the current loop and start over (scoring is idempotent so it's OK).
            // Makes the feed scoring more responsive to the user adjusting the weights to not have to wait.
            let releaseMutex;
            if (isScoringFeed) {
                SCORE_MUTEX.cancel();
                releaseMutex = await SCORE_MUTEX.acquire();
                // Feed scorers' data must be refreshed each time the feed changes
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
     * Check that the weights object contains valid weight names and values.
     * @param weights - Weights object to validate.
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
    // Add all the score info to a Toot's scoreInfo property
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
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
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
            scoreDict[scorer.name] = {
                raw: rawScore,
                weighted: weightedScore,
            };
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
    // Add 1 so that time decay multiplier works even with scorers giving 0s
    static sumScores(scores, scoreType) {
        return 1 + (0, collection_helpers_1.sumArray)(Object.values(scores).map((s) => s[scoreType]));
    }
}
exports.default = Scorer;
;
//# sourceMappingURL=scorer.js.map