"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for scorers that require processing external data before they can score anything.
 * For example DiversityFeedScorer has to count how many toots by each user are in your feed
 * before it knows how much to penalize prolific tooters.
 */
const scorer_1 = __importDefault(require("./scorer"));
class FeedScorer extends scorer_1.default {
    features = {};
    async setFeed(feed) {
        // console.debug(`before feedExtractor() this.features=`, this.features);
        this.features = this.feedExtractor(feed);
        console.debug(`after ${this.constructor.name}.feedExtractor() this.features=`, this.features);
        this._isReady = true;
    }
    //* Should be overloaded in subclasses. */
    feedExtractor(_feed) {
        throw new Error("Method not implemented.");
    }
}
exports.default = FeedScorer;
;
//# sourceMappingURL=feed_scorer.js.map