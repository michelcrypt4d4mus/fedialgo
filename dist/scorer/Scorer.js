"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for Toot scorers.
 */
const Storage_1 = __importDefault(require("../Storage"));
const config_1 = require("../config");
const types_1 = require("../types");
const TIME_DECAY = types_1.WeightName.TIME_DECAY;
class Scorer {
    name;
    description;
    defaultWeight;
    _isReady = false;
    constructor(name) {
        console.log(`Scorer's this.constructor.name: ${this.constructor.name}`);
        this.name = name;
        this.description = config_1.DEFAULT_WEIGHTS[name].description;
        this.defaultWeight = config_1.DEFAULT_WEIGHTS[name].defaultWeight ?? 1;
    }
    async score(toot) {
        this.checkIsReady();
        return await this._score(toot);
    }
    //* _score() should be overloaded in subclasses. *//
    async _score(_toot) {
        throw new Error("Method not implemented.");
    }
    getInfo() {
        return {
            description: this.description,
            defaultWeight: this.defaultWeight,
            scorer: this,
        };
    }
    checkIsReady() {
        if (!this._isReady) {
            const msg = `${this.name} scorer not ready!`;
            console.warn(msg);
            throw new Error(msg);
        }
    }
    // Add all the score into to a toot, including a final score
    static async decorateWithScoreInfo(toot, scorers) {
        // console.debug(`decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        let rawScore = 1;
        const rawScores = {};
        const weightedScores = {};
        const userWeights = await Storage_1.default.getWeightings();
        const scores = await Promise.all(scorers.map(s => s.score(toot)));
        toot.followedTags ??= [];
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            rawScore += weightedScores[scorer.name];
        });
        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        const trendingScore = rawScores[types_1.WeightName.TRENDING_TOOTS] ?? 0;
        const trendingWeighting = userWeights[types_1.WeightName.TRENDING_TOOTS] ?? 0;
        if (trendingScore > 0 && trendingWeighting < 1.0)
            rawScore *= trendingWeighting;
        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || config_1.DEFAULT_WEIGHTS[TIME_DECAY].defaultWeight;
        const seconds = Math.floor((new Date().getTime() - new Date(toot.createdAt).getTime()) / 1000);
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));
        const score = rawScore * timeDecayMultiplier;
        toot.scoreInfo = {
            rawScore,
            rawScores,
            score,
            timeDecayMultiplier,
            weightedScores,
        };
        // If it's a retoot copy the scores to the retooted toot as well // TODO: this is janky
        if (toot.reblog)
            toot.reblog.scoreInfo = toot.scoreInfo;
    }
}
exports.default = Scorer;
;
//# sourceMappingURL=scorer.js.map