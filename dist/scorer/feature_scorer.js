"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const scorer_1 = __importDefault(require("./scorer"));
class FeatureScorer extends scorer_1.default {
    requiredData = {}; // TODO: rename this to supportData or something
    constructor(scoreName) {
        super(scoreName);
    }
    // Can be overloaded in subclasses to retrieve feature data from the server
    async featureGetter(api) {
        return {};
    }
    async getFeature(api) {
        try {
            this.requiredData = await this.featureGetter(api);
        }
        catch (e) {
            console.warn(`Error in getFeature() for ${this.name}:`, e);
        }
        console.log(`${this.constructor.name} featureGetter() returned:`, this.requiredData);
        this.isReady = true;
        return []; // this is a hack so we can safely use Promise.all().flat() to pull startup data
    }
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=feature_scorer.js.map