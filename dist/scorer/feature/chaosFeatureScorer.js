"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Random number generator to mix up the feed.
 */
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
class chaosFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Insert Randomness and Chaos into the feed - because its fair",
            defaultWeight: 1,
            featureGetter: (async () => { return {}; }),
            scoreName: "Chaos",
        });
    }
    async score() {
        return Math.random();
    }
}
exports.default = chaosFeatureScorer;
;
//# sourceMappingURL=chaosFeatureScorer.js.map