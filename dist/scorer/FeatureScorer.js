"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
class FeatureScorer {
    featureGetter;
    feature = {};
    _description = "";
    _defaultWeight = 1;
    _isReady = false;
    _scoreName;
    constructor(params) {
        // The featureGetter is a fxn that retrieves data the scorer will need to score a toot,
        // e.g. things like most commonly retooted users etc.
        this.featureGetter = params.featureGetter || (async () => { return {}; });
        this._scoreName = params.scoreName;
        this._description = params.description || "";
        // Take care not to overwrite a 0 default weight with a 1
        this._defaultWeight = params.defaultWeight == 0 ? 0 : (params.defaultWeight || 1);
    }
    // TODO: this seems backwards???
    async getFeature(api) {
        this._isReady = true;
        this.feature = await this.featureGetter(api);
    }
    //* score() should be overloaded in subclasses *//
    async score(_toot) {
        return 0;
    }
    getScoreName() {
        return this._scoreName;
    }
    getDescription() {
        return this._description;
    }
    getDefaultWeight() {
        return this._defaultWeight;
    }
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=FeatureScorer.js.map