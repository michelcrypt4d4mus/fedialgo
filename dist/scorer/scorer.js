"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for Toot scorers.
 */
const async_mutex_1 = require("async-mutex");
const Storage_1 = __importDefault(require("../Storage"));
const weight_presets_1 = require("./weight_presets");
const string_helpers_1 = require("../helpers/string_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
const types_1 = require("../types");
const config_1 = require("../config");
const SCORE_MUTEX = new async_mutex_1.Mutex();
class Scorer {
    defaultWeight;
    description;
    isReady = false; // Set to true when the scorer is ready to score
    name;
    scoreData = {}; // Background data used to score a toot
    constructor(name) {
        this.name = name;
        this.description = config_1.SCORERS_CONFIG[name].description;
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
        this.checkIsReady();
        return await this._score(toot);
    }
    // Logging helper
    logPrefix() {
        return `[${this.constructor.name}]`;
    }
    // Throw an error if the scorer is not ready to score
    checkIsReady() {
        if (!this.isReady)
            (0, string_helpers_1.logAndThrowError)(`${this.name} scorer not ready!`);
    }
    ///////////////////////////////
    //   Static class methods  ////
    ///////////////////////////////
    // Score and sort the toots. This DOES NOT mutate the order of 'toots' array in place
    static async scoreToots(toots, featureScorers, feedScorers) {
        const scorers = [...featureScorers, ...feedScorers];
        const logPrefix = `[scoreFeed()]`;
        console.debug(`${logPrefix} Scoring ${toots.length} toots with ${scorers.length} scorers...`);
        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            // If the mutex is already locked just cancel the current scoring loop and start over
            // (scoring is idempotent, so this is safe).
            // Tnis done to make the feed more immediately responsive to the user adjusting the weights -
            // rather than waiting for a rescore to finish we just cancel it and start over.
            SCORE_MUTEX.cancel();
            const releaseMutex = await SCORE_MUTEX.acquire();
            try {
                // Feed scorers' data must be refreshed each time the feed changes
                feedScorers.forEach(scorer => scorer.extractScoreDataFromFeed(toots));
                // Score the toots asynchronously in batches
                await (0, collection_helpers_1.batchPromises)(toots, (t) => this.decorateWithScoreInfo(t, scorers), "Scorer");
                // Sort feed based on score from high to low.
                toots = toots.toSorted((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
            }
            finally {
                releaseMutex();
            }
        }
        catch (e) {
            if (e == async_mutex_1.E_CANCELED) {
                console.debug(`${logPrefix} mutex cancellation`);
            }
            else {
                console.warn(`${logPrefix} caught error:`, e);
            }
        }
        return toots;
    }
    // Add all the score info to a Toot's scoreInfo property
    static async decorateWithScoreInfo(toot, scorers) {
        const rawScores = {};
        const weightedScores = {};
        const userWeights = await Storage_1.default.getWeightings();
        const scores = await Promise.all(scorers.map((s) => s.score(toot)));
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            if (toot.realToot().isTrending()) {
                weightedScores[scorer.name] *= (userWeights[types_1.WeightName.TRENDING] ?? 0);
            }
        });
        // Multiple weighted score by time decay penalty to get a final weightedScore
        const timeDecayWeight = userWeights[types_1.WeightName.TIME_DECAY] || weight_presets_1.DEFAULT_WEIGHTS[types_1.WeightName.TIME_DECAY];
        const decayExponent = -1 * Math.pow(toot.ageInHours(), Storage_1.default.getConfig().timelineDecayExponent);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, decayExponent);
        const weightedScore = this.sumScores(weightedScores);
        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        // TODO: duping the score to realToot() is a hack that sucks
        toot.realToot().scoreInfo = toot.scoreInfo = {
            rawScore: this.sumScores(rawScores),
            rawScores,
            score: weightedScore * timeDecayMultiplier,
            timeDecayMultiplier,
            weightedScores,
            weightedScore,
        };
    }
    // Add 1 so that time decay multiplier works even with scorers giving 0s
    static sumScores(scores) {
        return 1 + (0, collection_helpers_1.sumValues)(scores);
    }
}
exports.default = Scorer;
;
//# sourceMappingURL=scorer.js.map