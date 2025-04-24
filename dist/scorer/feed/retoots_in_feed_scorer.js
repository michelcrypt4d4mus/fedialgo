"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
const feed_scorer_1 = __importDefault(require("../feed_scorer"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const types_1 = require("../../types");
class RetootsInFeedScorer extends feed_scorer_1.default {
    constructor() {
        super(types_1.WeightName.RETOOTED_IN_FEED);
    }
    // For each uri in the feed, count the number of times it appears as a reblogged toot.
    feedExtractor(feed) {
        return feed.reduce((tootCounts, toot) => {
            if (!toot.reblog)
                return tootCounts;
            (0, collection_helpers_1.incrementCount)(tootCounts, toot.reblog.uri);
            return tootCounts;
        }, {});
    }
    async _score(toot) {
        return this.requiredData[toot.realURI()] || 0;
    }
}
exports.default = RetootsInFeedScorer;
;
//# sourceMappingURL=retoots_in_feed_scorer.js.map