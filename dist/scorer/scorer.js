"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for Toot scorers.
 */
const Storage_1 = __importDefault(require("../Storage"));
const weight_presets_1 = require("./weight_presets");
const types_1 = require("../types");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
class Scorer {
    defaultWeight;
    description;
    name;
    isReady = false;
    constructor(name) {
        // TODO: Maybe use this.constructor.name as the name property?
        this.name = name;
        this.description = config_1.SCORERS_CONFIG[name].description;
        this.defaultWeight = weight_presets_1.DEFAULT_WEIGHTS[name] ?? 1;
    }
    async score(toot) {
        this.checkIsReady();
        return await this._score(toot);
    }
    getInfo() {
        return {
            description: this.description,
            scorer: this,
        };
    }
    checkIsReady() {
        if (!this.isReady) {
            const msg = `${this.name} scorer not ready!`;
            console.warn(msg);
            throw new Error(msg);
        }
    }
    // Add all the score into to a toot, including a final score
    static async decorateWithScoreInfo(toot, scorers) {
        // console.debug(`decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        const rawScores = {};
        const weightedScores = {};
        const userWeights = await Storage_1.default.getWeightings();
        const tootToScore = toot.reblog ?? toot;
        const scores = await Promise.all(scorers.map(s => s.score(tootToScore)));
        tootToScore.followedTags ??= [];
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            if (tootToScore.isTrending()) {
                weightedScores[scorer.name] *= (userWeights[types_1.WeightName.TRENDING] ?? 0);
            }
        });
        // Multiple weighted score by time decay penalty to get a final weightedScore
        const timeDecayWeight = userWeights[types_1.WeightName.TIME_DECAY] || weight_presets_1.DEFAULT_WEIGHTS[types_1.WeightName.TIME_DECAY];
        // const timeDecayMultiplier = 1.0 / Math.pow(tootToScore.ageInHours(), timeDecayWeight);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, -1 * Math.pow(tootToScore.ageInHours(), 1.2));
        const weightedScore = this.sumScores(weightedScores);
        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        tootToScore.scoreInfo = {
            rawScore: this.sumScores(rawScores),
            rawScores,
            score: weightedScore * timeDecayMultiplier,
            timeDecayMultiplier,
            weightedScores,
            weightedScore,
        };
        // Copy the score info to the retoot if need be  // TODO: duping the score for retoots is a hack
        toot.scoreInfo = tootToScore.scoreInfo;
    }
    // Add 1 so that time decay multiplier works even with scorers giving 0s
    static sumScores(scores) {
        return 1 + (0, collection_helpers_1.sumValues)(scores);
    }
}
exports.default = Scorer;
;
//# sourceMappingURL=scorer.js.map