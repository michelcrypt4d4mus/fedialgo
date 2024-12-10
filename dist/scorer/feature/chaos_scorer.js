"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Random number generator to mix up the feed.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const types_1 = require("../../types");
class ChaosScorer extends feature_scorer_1.default {
    constructor() {
        super({ scoreName: types_1.WeightName.CHAOS });
    }
    async _score(toot) {
        try {
            return this.decimalHash(toot.content);
        }
        catch (e) {
            console.warn(`Error in _score() for ${this.name}:`, e);
            console.warn(`Toot with error in ChaosScorer:`, toot);
            return 0;
        }
    }
    // Use a hash to get a deterministic score between 0 and 1
    decimalHash(s) {
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            hash = s.charCodeAt(i) + ((hash << 5) - hash);
        }
        return (hash & hash) / Math.pow(2, 31);
    }
}
exports.default = ChaosScorer;
;
//# sourceMappingURL=chaos_scorer.js.map