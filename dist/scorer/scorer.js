"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for Toot scorers.
 */
const async_mutex_1 = require("async-mutex");
const scorer_cache_1 = __importDefault(require("./scorer_cache"));
const Storage_1 = __importDefault(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
const config_1 = require("../config");
const weight_presets_1 = require("./weight_presets");
const log_helpers_1 = require("../helpers/log_helpers");
const types_1 = require("../types");
const SCORE_DIGITS = 3; // Number of digits to display in the alternate score
const SCORE_MUTEX = new async_mutex_1.Mutex();
const SCORE_PREFIX = "scoreToots()";
class Scorer {
    defaultWeight;
    description;
    isReady = false; // Set to true when the scorer is ready to score
    name;
    scoreData = {}; // Background data used to score a toot
    constructor(name) {
        this.name = name;
        this.description = config_1.Config.scorersConfig[name].description;
        this.defaultWeight = weight_presets_1.DEFAULT_WEIGHTS[name] ?? 1;
    }
    // Return a ScorerInfo object with the description and the scorer itself
    getInfo() {
        return {
            description: this.description,
            scorer: this,
        };
    }
    // This is the public API for scoring a toot
    async score(toot) {
        if (this.isReady)
            return await this._score(toot);
        if (!toot.scoreInfo) {
            console.warn(`${this.logPrefix()} not ready, scoring 0...`);
            return 0;
        }
        else {
            const existingScore = toot.scoreInfo.rawScores[this.name];
            console.debug(`${this.logPrefix()} Not ready but toot already scored (existing score: ${existingScore})`);
            return existingScore;
        }
    }
    // Logging helper
    logPrefix() {
        return `[${this.constructor.name}]`;
    }
    // Throw an error if the scorer is not ready to score
    checkIsReady() {
        if (!this.isReady)
            (0, log_helpers_1.logAndThrowError)(`${this.name} scorer not ready!`);
    }
    ///////////////////////////////
    //   Static class methods  ////
    ///////////////////////////////
    // Score and sort the toots. This DOES NOT mutate the order of 'toots' array in place
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
            try {
                // Score the toots asynchronously in batches
                await (0, collection_helpers_1.batchMap)(toots, (t) => this.decorateWithScoreInfo(t, scorers), "Scorer");
            }
            finally {
                releaseMutex?.();
            }
            // Sort feed based on score from high to low and return
            (0, log_helpers_1.logDebug)(SCORE_PREFIX, `scored ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)} (${scorers.length} scorers)`);
            toots = toots.toSorted((a, b) => b.getScore() - a.getScore());
        }
        catch (e) {
            if (e == async_mutex_1.E_CANCELED) {
                (0, log_helpers_1.logDebug)(SCORE_PREFIX, `mutex cancellation`);
            }
            else {
                console.warn(`${SCORE_PREFIX} caught error:`, e);
            }
        }
        return toots;
    }
    // Return a scoreInfo dict in a different format for the GUI (raw & weighted scores grouped in a subdict)
    static alternateScoreInfo(toot) {
        if (!toot.scoreInfo)
            return {};
        return Object.entries(toot.scoreInfo).reduce((scoreDict, [key, value]) => {
            if (key == "rawScores") {
                scoreDict["scores"] = Object.entries(value).reduce((scoreDetails, [scoreKey, scoreValue]) => {
                    const weightedScore = toot.scoreInfo.weightedScores[scoreKey];
                    scoreDetails[scoreKey] = {
                        unweighted: toScoreFmt(scoreValue),
                        weighted: toScoreFmt(weightedScore),
                    };
                    return scoreDetails;
                }, {});
            }
            else if (key != "weightedScores") {
                scoreDict[key] = toScoreFmt(value);
            }
            return scoreDict;
        }, {});
    }
    // Add all the score info to a Toot's scoreInfo property
    static async decorateWithScoreInfo(toot, scorers) {
        // Find non scorer weights
        const userWeights = await Storage_1.default.getWeights();
        const getWeight = (weightKey) => userWeights[weightKey] ?? weight_presets_1.DEFAULT_WEIGHTS[weightKey];
        const outlierDampener = getWeight(types_1.WeightName.OUTLIER_DAMPENER);
        const timeDecayWeight = getWeight(types_1.WeightName.TIME_DECAY) / 10; // Divide by 10 to make it more user friendly
        const trendingMultiplier = getWeight(types_1.WeightName.TRENDING);
        // Initialize variables
        const realToot = toot.realToot();
        const rawScores = {};
        const weightedScores = {};
        // Do scoring
        const scores = await Promise.all(scorers.map((s) => s.score(toot)));
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            // Apply the TRENDING modifier but only to toots that are not from followed accounts or tags
            if (realToot.isTrending() && (!realToot.isFollowed() || types_1.TRENDING_WEIGHTS.includes(scorer.name))) {
                weightedScores[scorer.name] *= trendingMultiplier;
            }
            // Outlier dampener of 2 means take the square root of the score, 3 means cube root, etc.
            if (outlierDampener > 0) {
                const scorerScore = weightedScores[scorer.name];
                // Diversity scores are negative so we temporarily flip the sign to get the root
                if (scorerScore >= 0) {
                    weightedScores[scorer.name] = Math.pow(scorerScore, 1 / outlierDampener);
                }
                else {
                    weightedScores[scorer.name] = -1 * Math.pow(-1 * scorerScore, 1 / outlierDampener);
                }
            }
        });
        // Multiple weighted score by time decay penalty to get a final weightedScore
        const decayExponent = -1 * Math.pow(toot.ageInHours(), config_1.Config.timelineDecayExponent);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, decayExponent);
        const weightedScore = this.sumScores(weightedScores);
        const score = weightedScore * timeDecayMultiplier;
        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        const scoreInfo = {
            rawScore: this.sumScores(rawScores),
            rawScores,
            score,
            timeDecayMultiplier,
            trendingMultiplier,
            weightedScores,
            weightedScore,
        };
        // TODO: duping the score to realToot() is a hack that sucks
        toot.realToot().scoreInfo = toot.scoreInfo = scoreInfo;
    }
    // Add 1 so that time decay multiplier works even with scorers giving 0s
    static sumScores(scores) {
        return 1 + (0, collection_helpers_1.sumValues)(scores);
    }
}
exports.default = Scorer;
;
function toScoreFmt(score) {
    if (typeof score != "number") {
        console.warn(`${SCORE_PREFIX} toScoreFmt() called with non-number:`, score);
        return score;
    }
    if (Math.abs(score) < Math.pow(10, -1 * SCORE_DIGITS))
        return score;
    return Number(score.toPrecision(SCORE_DIGITS));
}
;
//# sourceMappingURL=scorer.js.map