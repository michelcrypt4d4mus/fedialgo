"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Random number generator to mix up the feed.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const config_1 = require("../../config");
class ChaosFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({ scoreName: config_1.WeightName.CHAOS });
    }
    async _score() {
        return Math.random();
    }
}
exports.default = ChaosFeatureScorer;
;
//# sourceMappingURL=chaosFeatureScorer.js.map