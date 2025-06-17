"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
/** Scores with the trendingRank set by getTrendingToots(). */
class TrendingTootScorer extends toot_scorer_1.default {
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