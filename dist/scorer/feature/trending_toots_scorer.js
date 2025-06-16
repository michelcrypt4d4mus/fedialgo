"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const enums_1 = require("../../enums");
class TrendingTootScorer extends feature_scorer_1.default {
    description = "Favour toots that are trending in the Fediverse";
    constructor() {
        super(enums_1.ScoreName.TRENDING_TOOTS);
    }
    async _score(toot) {
        return toot.realToot.trendingRank || 0;
    }
}
exports.default = TrendingTootScorer;
;
//# sourceMappingURL=trending_toots_scorer.js.map