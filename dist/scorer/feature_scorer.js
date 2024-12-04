"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const scorer_1 = __importDefault(require("./scorer"));
;
class FeatureScorer extends scorer_1.default {
    // The featureGetter is a fxn that retrieves data the scorer will need to score a toot,
    // e.g. things like most commonly retooted users etc.
    featureGetter;
    feature = {}; // TODO: rename this to supportData or something
    constructor(params) {
        super(params.scoreName, params.description, params.defaultWeight);
        this.featureGetter = params.featureGetter || (async () => { return {}; });
    }
    async getFeature(api) {
        try {
            this.feature = await this.featureGetter(api);
        }
        catch (e) {
            console.warn(`Error in getFeature() for ${this.name}:`, e);
        }
        this._isReady = true;
        return []; // this is a hack so we can safely use Promise.all().flat() to get 'allResponses'
    }
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=feature_scorer.js.map