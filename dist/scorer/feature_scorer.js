"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const scorer_1 = __importDefault(require("./scorer"));
// TODO: Find a better name than "Feature" for this class
class FeatureScorer extends scorer_1.default {
    constructor(scoreName) {
        super(scoreName);
    }
    // Can be overloaded in subclasses to set up any data required for scoring Toots
    async prepareScoreData() {
        return {};
    }
    async fetchRequiredData() {
        try {
            this.scoreData = await this.prepareScoreData();
        }
        catch (e) {
            console.error(`${this.logPrefix()} Error in prepareScoreData():`, e);
            this.scoreData = {};
        }
        if (Object.values(this.scoreData).length > 0) {
            console.debug(`${this.logPrefix()} prepareScoreData() returned:`, this.scoreData);
        }
        this.isReady = true;
    }
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=feature_scorer.js.map