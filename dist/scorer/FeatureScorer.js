"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
class FeatureScorer {
    featureGetter;
    feature = {};
    _verboseName;
    _isReady = false;
    _description = "";
    _defaultWeight = 1;
    constructor(params) {
        this.featureGetter = params.featureGetter;
        this._verboseName = params.verboseName;
        this._description = params.description || "";
        this._defaultWeight = params.defaultWeight || 1;
    }
    async getFeature(api) {
        this._isReady = true;
        this.feature = await this.featureGetter(api);
    }
    async score(_api, _status) {
        return 0;
    }
    getVerboseName() {
        return this._verboseName;
    }
    getDescription() {
        return this._description;
    }
    getDefaultWeight() {
        return this._defaultWeight;
    }
}
exports.default = FeatureScorer;
//# sourceMappingURL=FeatureScorer.js.map