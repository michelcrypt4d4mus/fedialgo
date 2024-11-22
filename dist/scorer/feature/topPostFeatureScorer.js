"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
class topPostFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            featureGetter: (_api) => { return Promise.resolve({}); },
            verboseName: "TopPosts",
            description: "Favor posts that are trending in the Fediverse",
            defaultWeight: 1,
        });
    }
    async score(_api, status) {
        return status.topPost || 0;
    }
}
exports.default = topPostFeatureScorer;
;
