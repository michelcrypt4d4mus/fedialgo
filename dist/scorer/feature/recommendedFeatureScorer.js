"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
class recommendedFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: (_api) => { return Promise.resolve({}); },
            scoreName: "Recommended",
            description: "Posts that are recommended by AI embeddings",
            defaultWeight: 1,
        });
    }
    async _score(toot) {
        return toot.recommended ? toot.similarity ?? 1 : 0;
    }
}
exports.default = recommendedFeatureScorer;
//# sourceMappingURL=recommendedFeatureScorer.js.map