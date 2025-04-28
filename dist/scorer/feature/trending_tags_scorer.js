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
const types_1 = require("../../types");
class TrendingTagsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.TRENDING_TAGS);
    }
    async _score(toot) {
        toot = toot.reblog || toot;
        return toot.trendingTags.reduce((sum, tag) => sum + (tag.numAccounts || 0), 0);
    }
}
exports.default = TrendingTagsScorer;
;
//# sourceMappingURL=trending_tags_scorer.js.map