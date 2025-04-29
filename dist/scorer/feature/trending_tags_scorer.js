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
const types_1 = require("../../types");
const EXCESSIVE_TAGS_PENALTY = 0.1;
class TrendingTagsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.TRENDING_TAGS);
    }
    async _score(toot) {
        let score = (toot.reblog || toot).trendingTags.reduce((sum, tag) => sum + (tag.numAccounts || 0), 0);
        if (score > 0 && toot.tags.length >= Storage_1.default.getConfig().excessiveTags) {
            console.info(`[${this.constructor.name}] Penalizing excessive tags (${toot.tags.length}) in:`, toot);
            score *= EXCESSIVE_TAGS_PENALTY;
        }
        return score;
    }
}
exports.default = TrendingTagsScorer;
;
//# sourceMappingURL=trending_tags_scorer.js.map