"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRENDING_TOOTS_DEFAULT_WEIGHT = exports.TRENDING_TOOTS = void 0;
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
exports.TRENDING_TOOTS = "TrendingToots";
exports.TRENDING_TOOTS_DEFAULT_WEIGHT = 0.1;
// TODO: rename TrendingTootFeatureScorer
class TopPostFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favor toots that are trending across the Fediverse",
            defaultWeight: exports.TRENDING_TOOTS_DEFAULT_WEIGHT,
            scoreName: exports.TRENDING_TOOTS,
        });
    }
    async score(toot) {
        return toot.trendingRank || 0;
    }
}
exports.default = TopPostFeatureScorer;
;
//# sourceMappingURL=topPostFeatureScorer.js.map