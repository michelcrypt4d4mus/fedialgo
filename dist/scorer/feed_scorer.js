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
    // Take an array of Toots and extract the scoreData needed to score a toot
    async setFeed(feed) {
        this.scoreData = this.feedExtractor(feed);
        console.debug(`[${this.constructor.name}] feedExtractor() set scoreData to`, this.scoreData);
        this.isReady = true;
    }
}
exports.default = FeedScorer;
;
//# sourceMappingURL=feed_scorer.js.map