"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
const scorer_1 = __importDefault(require("./scorer"));
// TODO: Find a better name than "Feature" for this class
class FeatureScorer extends scorer_1.default {
    requiredData = {};
    constructor(scoreName) {
        super(scoreName);
    }
    // Can be overloaded in subclasses to retrieve feature data from the server
    async featureGetter() {
        return {};
    }
    async getFeature() {
        try {
            this.requiredData = await this.featureGetter();
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