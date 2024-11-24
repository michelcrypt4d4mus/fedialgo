"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeedScorer_1 = __importDefault(require("../FeedScorer"));
const DEFAULT_REBLOGS_WEIGHT = 2;
const SCORE_NAME = "RetootedInFeed";
// TODO: rename retootsFeedScorer
class ReblogsFeedScorer extends FeedScorer_1.default {
    constructor() {
        super(SCORE_NAME, "Favour toots that are retooted by other accounts in your feed", DEFAULT_REBLOGS_WEIGHT);
    }
    // for each uri in the feed, count the number of times it appears
    feedExtractor(feed) {
        return feed.reduce((tootCounts, toot) => {
            tootCounts[toot.uri] = (tootCounts[toot.uri] || 0) + 1;
            if (toot.reblog) {
                tootCounts[toot.reblog.uri] = (tootCounts[toot.reblog.uri] || 0) + 1;
            }
            return tootCounts;
        }, {});
    }
    async score(toot) {
        super.score(toot); // checks if ready
        return this.features[toot.reblog?.uri || toot.uri] || 0;
    }
}
exports.default = ReblogsFeedScorer;
;
//# sourceMappingURL=reblogsFeedScorer.js.map