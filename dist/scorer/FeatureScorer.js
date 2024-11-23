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
        this.featureGetter = params.featureGetter;
        this._scoreName = params.scoreName;
        this._description = params.description || "";
        this._defaultWeight = params.defaultWeight || 1;
    }
    // TODO: this seems backwards???
    async getFeature(api) {
        this._isReady = true;
        this.feature = await this.featureGetter(api);
    }
    async score(_api, _toot) {
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