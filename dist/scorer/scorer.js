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
const config_1 = require("../config");
const types_1 = require("../types");
const TIME_DECAY = types_1.WeightName.TIME_DECAY;
class Scorer {
    defaultWeight;
    description;
    name;
    isReady = false;
    constructor(name) {
        // console.debug(`Scorer's this.constructor.name: ${this.constructor.name}`);
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
        let rawScore = 1;
        const tootToScore = toot.reblog ?? toot;
        const rawScores = {};
        const weightedScores = {};
        const userWeights = await Storage_1.default.getWeightings();
        const scores = await Promise.all(scorers.map(s => s.score(tootToScore)));
        tootToScore.followedTags ??= [];
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            rawScore += weightedScores[scorer.name];
        });
        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || weight_presets_1.DEFAULT_WEIGHTS[TIME_DECAY];
        const seconds = Math.floor((new Date().getTime() - new Date(tootToScore.createdAt).getTime()) / 1000);
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));
        tootToScore.scoreInfo = {
            rawScore,
            rawScores,
            score: 0,
            timeDecayMultiplier,
            weightedScores,
        };
        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To adjust for this we hack a final adjustment to the score by multiplying by the
        // trending weighting value.
        if (tootToScore.isTrending()) {
            tootToScore.scoreInfo.rawScore *= (userWeights[types_1.WeightName.TRENDING] ?? 0);
        }
        tootToScore.scoreInfo.score = tootToScore.scoreInfo.rawScore * timeDecayMultiplier;
        toot.scoreInfo = tootToScore.scoreInfo; // Copy the score info to the retoot if need be
    }
}
exports.default = Scorer;
;
//# sourceMappingURL=scorer.js.map