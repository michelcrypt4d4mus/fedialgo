"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRENDING_POSTS_DEFAULT_WEIGHT = exports.TRENDING_POSTS = void 0;
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
exports.TRENDING_POSTS = "topPosts";
exports.TRENDING_POSTS_DEFAULT_WEIGHT = 0.1;
class TopPostFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favor toots that are trending in the Fediverse from accounts you don't follow",
            defaultWeight: exports.TRENDING_POSTS_DEFAULT_WEIGHT,
            scoreName: exports.TRENDING_POSTS,
        });
    }
    // TODO: rename topPostRank
    async score(toot) {
        return toot.topPost || 0;
    }
}
exports.default = TopPostFeatureScorer;
;
//# sourceMappingURL=topPostFeatureScorer.js.map