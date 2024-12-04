"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRENDING_TOOTS_DEFAULT_WEIGHT = exports.TRENDING_TOOTS = void 0;
/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
exports.TRENDING_TOOTS = "TrendingToots";
exports.TRENDING_TOOTS_DEFAULT_WEIGHT = 0.08;
// TODO: rename TrendingTootFeatureScorer
class TrendingTootFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour toots that are trending in the Fediverse",
            defaultWeight: exports.TRENDING_TOOTS_DEFAULT_WEIGHT,
            scoreName: exports.TRENDING_TOOTS,
        });
    }
    async _score(toot) {
        return toot.trendingRank || 0;
    }
}
exports.default = TrendingTootFeatureScorer;
;
//# sourceMappingURL=trending_toots_feature_scorer.js.map