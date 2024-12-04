"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
const feed_scorer_1 = __importDefault(require("../feed_scorer"));
const DEFAULT_REBLOGS_WEIGHT = 2;
const SCORE_NAME = "RetootedInFeed";
class RetootsInFeedScorer extends feed_scorer_1.default {
    constructor() {
        super(SCORE_NAME, "Favour toots retooted by multiple accounts you follow", DEFAULT_REBLOGS_WEIGHT);
    }
    // for each uri in the feed, count the number of times it appears
    feedExtractor(feed) {
        return feed.reduce((tootCounts, toot) => {
            if (toot.reblog) {
                tootCounts[toot.reblog.uri] = (tootCounts[toot.reblog.uri] || 0) + 1;
            }
            return tootCounts;
        }, {});
    }
    async _score(toot) {
        return this.features[toot.reblog?.uri || toot.uri] || 0;
    }
}
exports.default = RetootsInFeedScorer;
;
//# sourceMappingURL=retoots_in_feed_scorer.js.map