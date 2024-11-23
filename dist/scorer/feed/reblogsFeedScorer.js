"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeedScorer_1 = __importDefault(require("../FeedScorer"));
const DEFAULT_REBLOGS_WEIGHT = 2;
class reblogsFeedScorer extends FeedScorer_1.default {
    constructor() {
        super("reblogsFeed", // TODO: rename to reblogCount
        "Favor posts that have been retooted many times", DEFAULT_REBLOGS_WEIGHT);
    }
    // for each uri in the feed, count the number of times it appears
    feedExtractor(feed) {
        return feed.reduce((obj, toot) => {
            obj[toot.uri] = (obj[toot.uri] || 0) + 1;
            if (toot.reblog) {
                obj[toot.reblog.uri] = (obj[toot.reblog.uri] || 0) + 1;
            }
            return obj;
        }, {});
    }
    async score(toot) {
        super.score(toot); // checks if ready
        return this.features[toot.reblog?.uri || toot.uri] || 0;
    }
}
exports.default = reblogsFeedScorer;
//# sourceMappingURL=reblogsFeedScorer.js.map