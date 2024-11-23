"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRENDING_POSTS_DEFAULT_WEIGHT = exports.TRENDING_POSTS = void 0;
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
exports.TRENDING_POSTS = "topPosts";
exports.TRENDING_POSTS_DEFAULT_WEIGHT = 0.1;
class topPostFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            featureGetter: (_api) => { return Promise.resolve({}); },
            verboseName: exports.TRENDING_POSTS,
            description: "Favor posts that are trending in the Fediverse",
            defaultWeight: exports.TRENDING_POSTS_DEFAULT_WEIGHT,
        });
    }
    // TODO: rename topPostRank
    async score(_api, toot) {
        return toot.topPost || 0;
    }
}
exports.default = topPostFeatureScorer;
;
//# sourceMappingURL=topPostFeatureScorer.js.map