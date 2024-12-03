"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRENDING_TAGS_DEFAULT_WEIGHT = exports.TRENDING_TAGS = void 0;
/*
 * Computes the number of accounts that have interacted with a toot's trending tags
 */
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
exports.TRENDING_TAGS = "TrendingTags";
exports.TRENDING_TAGS_DEFAULT_WEIGHT = 0.06;
class TrendingTagsFeatureScorer extends FeatureScorer_1.default {
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
        return tags.reduce((sum, tag) => sum + (tag.numAccounts || 0), 0);
    }
}
exports.default = TrendingTagsFeatureScorer;
;
// TODO: unused
function logNumAccounts(tag) {
    const numAccounts = tag.numAccounts || Math.E;
    let score = 0;
    if (numAccounts >= Math.E) {
        score = 1 + Math.log(numAccounts);
    }
    else if (numAccounts >= 1) {
        score = numAccounts;
    }
    console.debug(`[TrendingTags] score: ${score} for tag:`, tag);
    return score;
}
//# sourceMappingURL=trending_tags_scorer.js.map