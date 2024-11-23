"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FeedScorer {
    features = {};
    _scoreName = "BaseScorer";
    _isReady = false;
    _description = "";
    _defaultWeight = 1;
    constructor(scoreName, description, defaultWeight) {
        this._scoreName = scoreName;
        this._description = description || "";
        this._defaultWeight = defaultWeight || 1;
    }
    async setFeed(feed) {
        this.features = await this.feedExtractor(feed);
        this._isReady = true;
    }
    feedExtractor(_feed) {
        throw new Error("Method not implemented.");
    }
    async score(_toot) {
        if (!this._isReady)
            throw new Error("FeedScorer not ready");
        return 0;
    }
    getVerboseName() {
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
//# sourceMappingURL=FeedScorer.js.map