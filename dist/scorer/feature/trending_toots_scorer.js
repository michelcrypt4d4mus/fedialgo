"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const types_1 = require("../../types");
class TrendingTootScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.TRENDING_TOOTS);
    }
    async _score(toot) {
        return toot.trendingRank || 0;
    }
}
exports.default = TrendingTootScorer;
;
//# sourceMappingURL=trending_toots_scorer.js.map