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
        super(params.scoreName);
        this.featureGetter = params.featureGetter || (async (_api) => { return {}; });
    }
    async getFeature(api) {
        try {
            this.feature = await this.featureGetter(api);
        }
        catch (e) {
            console.warn(`Error in getFeature() for ${this.name}:`, e);
        }
        console.log(`${this.constructor.name} featureGetter() returned:`, this.feature);
        this.isReady = true;
        return []; // this is a hack so we can safely use Promise.all().flat() to pull startup data
    }
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=feature_scorer.js.map