"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FeedScorer {
    features = {};
    _isReady = false;
    _scoreName = "BaseScorer";
    _description = "";
    _defaultWeight = 1;
    constructor(scoreName, description, defaultWeight) {
        this._scoreName = scoreName;
        this._description = description || "";
        this._defaultWeight = defaultWeight || 1;
    }
    async setFeed(feed) {
        console.log(`before feedExtractor() this.features=`, this.features);
        this.features = await this.feedExtractor(feed);
        console.log(`after feedExtractor() this.features=`, this.features);
        this._isReady = true;
    }
    feedExtractor(_feed) {
        throw new Error("Method not implemented.");
    }
    async score(_toot) {
        if (!this._isReady) {
            console.warn("FeedScorer not ready");
            throw new Error("FeedScorer not ready");
        }
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
exports.default = FeedScorer;
;
//# sourceMappingURL=FeedScorer.js.map