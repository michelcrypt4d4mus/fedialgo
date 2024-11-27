"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Random number generator to mix up the feed.
 */
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
class ChaosFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Insert Chaos into the scoring because social media ist krieg",
            defaultWeight: 1,
            scoreName: "Chaos",
        });
    }
    async score() {
        return Math.random();
    }
}
exports.default = ChaosFeatureScorer;
;
//# sourceMappingURL=chaosFeatureScorer.js.map