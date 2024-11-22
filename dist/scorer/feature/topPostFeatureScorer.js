"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOP_POSTS = void 0;
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
exports.TOP_POSTS = "topPosts";
class topPostFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            featureGetter: (_api) => { return Promise.resolve({}); },
            verboseName: exports.TOP_POSTS,
            description: "Favor posts that are trending in the Fediverse",
            defaultWeight: 1,
        });
    }
    async score(_api, status) {
        return status.topPost || 0; // TODO: rename topPostRank
    }
}
exports.default = topPostFeatureScorer;
;
