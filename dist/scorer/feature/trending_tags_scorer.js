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
const config_1 = require("../../config");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const log_helpers_1 = require("../../helpers/log_helpers");
const types_1 = require("../../types");
class TrendingTagsScorer extends feature_scorer_1.default {
    description = "Favour hashtags that are trending in the Fediverse";
    constructor() {
        super(types_1.ScoreName.TRENDING_TAGS);
    }
    async _score(toot) {
        const tags = toot.realToot().trendingTags || [];
        const tagScores = tags.map(tag => tag.numAccounts || 0);
        let score = (0, collection_helpers_1.sumArray)(tagScores);
        // If the toot is tag spam reduce the score
        if (score > 0 && toot.tags.length >= config_1.config.scoring.excessiveTags) {
            (0, log_helpers_1.traceLog)(`${this.logPrefix()} Penalizing excessive tags (${toot.tags.length}) in ${toot.describe()}`);
            score *= config_1.config.scoring.excessiveTagsPenalty;
        }
        return score;
    }
}
exports.default = TrendingTagsScorer;
;
//# sourceMappingURL=trending_tags_scorer.js.map