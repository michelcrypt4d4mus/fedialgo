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
        return feed.reduce((obj, status) => {
            obj[status.uri] = (obj[status.uri] || 0) + 1;
            if (status.reblog) {
                obj[status.reblog.uri] = (obj[status.reblog.uri] || 0) + 1;
            }
            return obj;
        }, {});
    }
    async score(status) {
        super.score(status); // checks if ready
        return this.features[status.reblog?.uri || status.uri] || 0;
    }
}
exports.default = reblogsFeedScorer;
