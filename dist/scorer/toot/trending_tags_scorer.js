"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const config_1 = require("../../config");
const enums_1 = require("../../enums");
const collection_helpers_1 = require("../../helpers/collection_helpers");
class TrendingTagsScorer extends toot_scorer_1.default {
    description = "Favour hashtags that are trending in the Fediverse";
    constructor() {
        super(enums_1.ScoreName.TRENDING_TAGS);
    }
    async _score(toot) {
        const tags = toot.realToot.trendingTags || [];
        const tagScores = tags.map(tag => tag.numAccounts || 0);
        let score = (0, collection_helpers_1.sumArray)(tagScores);
        // If the toot is tag spam reduce the score
        if (score > 0 && toot.tags.length >= config_1.config.scoring.excessiveTags) {
            this.logger.deep(`Penalizing excessive tags (${toot.tags.length}) in ${toot.description}`);
            score *= config_1.config.scoring.excessiveTagsPenalty;
        }
        return score;
    }
}
exports.default = TrendingTagsScorer;
;
//# sourceMappingURL=trending_tags_scorer.js.map