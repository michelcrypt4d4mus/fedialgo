"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Scores with the number of accounts that have posted a toot with the trending tag
 * across the Fediverse.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const Storage_1 = __importDefault(require("../../Storage"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const types_1 = require("../../types");
class TrendingTagsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.TRENDING_TAGS);
    }
    async _score(toot) {
        const tags = (toot.reblog || toot).trendingTags || [];
        const tagScores = tags.map(tag => tag.numAccounts || 0);
        let score = (0, collection_helpers_1.sumArray)(tagScores);
        // If the toot is tag spam reduce the score
        if (score > 0 && toot.tags.length >= Storage_1.default.getConfig().excessiveTags) {
            console.info(`${this.logPrefix()} Penalizing excessive tags (${toot.tags.length}) in:`, toot);
            score *= Storage_1.default.getConfig().excessiveTagsPenalty;
        }
        return score;
    }
}
exports.default = TrendingTagsScorer;
;
//# sourceMappingURL=trending_tags_scorer.js.map