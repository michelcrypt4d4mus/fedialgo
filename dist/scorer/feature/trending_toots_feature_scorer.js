"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRENDING_TOOTS_DEFAULT_WEIGHT = void 0;
/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const config_1 = require("../../config");
exports.TRENDING_TOOTS_DEFAULT_WEIGHT = 0.08;
class TrendingTootFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({ scoreName: config_1.WeightName.TRENDING_TOOTS });
    }
    async _score(toot) {
        return toot.trendingRank || 0;
    }
}
exports.default = TrendingTootFeatureScorer;
;
//# sourceMappingURL=trending_toots_feature_scorer.js.map