"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Scorer_1 = __importDefault(require("./Scorer"));
;
class FeatureScorer extends Scorer_1.default {
    // The featureGetter is a fxn that retrieves data the scorer will need to score a toot,
    // e.g. things like most commonly retooted users etc.
    featureGetter;
    feature = {};
    constructor(params) {
        super(params.scoreName, params.description, params.defaultWeight);
        this.featureGetter = params.featureGetter || (async () => { return {}; });
    }
    async getFeature(api) {
        this.feature = await this.featureGetter(api);
        this._isReady = true;
        return []; // TODO: this is a hack so we can use Promise.all() to get 'allResponses'
    }
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=FeatureScorer.js.map