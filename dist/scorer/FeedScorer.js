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
const Scorer_1 = __importDefault(require("./Scorer"));
class FeedScorer extends Scorer_1.default {
    features = {};
    constructor(scoreName, description, defaultWeight) {
        super(scoreName, description, defaultWeight);
    }
    async setFeed(feed) {
        // console.debug(`before feedExtractor() this.features=`, this.features);
        this.features = await this.feedExtractor(feed);
        console.debug(`after feedExtractor() this.features=`, this.features);
        this._isReady = true;
    }
    //* Should be overloaded in subclasses. */
    feedExtractor(_feed) {
        throw new Error("Method not implemented.");
    }
}
exports.default = FeedScorer;
;
//# sourceMappingURL=FeedScorer.js.map