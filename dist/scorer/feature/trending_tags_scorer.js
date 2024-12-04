"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRENDING_TAGS_DEFAULT_WEIGHT = exports.TRENDING_TAGS = void 0;
/*
 * Scores with the log2 of the number of accounts that have interacted with a toot's
 * trending tags across the Fediverse.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
exports.TRENDING_TAGS = "TrendingTags";
exports.TRENDING_TAGS_DEFAULT_WEIGHT = 0.4;
class TrendingTagsFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour hashtags that are trending in the Fediverse",
            defaultWeight: exports.TRENDING_TAGS_DEFAULT_WEIGHT,
            scoreName: exports.TRENDING_TAGS,
        });
    }
    // TODO: we could also use tag.numStatuses in some way (or instead)
    async _score(toot) {
        const tags = toot.trendingTags || [];
        const tagScore = tags.reduce((sum, tag) => sum + this.scoreTag(tag), 0);
        // console.debug(`[TrendingTagsFeatureScorer] Scored ${tagScore} for toot w/${toot.trendingTags?.length} trending tags:`, toot);
        return tagScore;
    }
    scoreTag(tag) {
        const numAccounts = tag.numAccounts || Math.E;
        let score = 0;
        if (numAccounts >= Math.E) {
            score = 1 + Math.log2(numAccounts);
        }
        else if (numAccounts >= 1) {
            score = numAccounts;
        }
        return score;
    }
}
exports.default = TrendingTagsFeatureScorer;
;
//# sourceMappingURL=trending_tags_scorer.js.map