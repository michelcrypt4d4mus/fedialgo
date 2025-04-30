"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
const feed_scorer_1 = __importDefault(require("../feed_scorer"));
const toot_1 = require("../../api/objects/toot");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const types_1 = require("../../types");
class DiversityFeedScorer extends feed_scorer_1.default {
    constructor() {
        super(types_1.WeightName.DIVERSITY);
    }
    // Count toots by account (but negative instead of positive count)
    extractScoringData(feed) {
        const sortedToots = (0, toot_1.sortByCreatedAt)(feed).reverse();
        // Collate the overall score for each account. The penalty for frequent tooters decreases by 1 per toot.
        const accountScores = sortedToots.reduce((tootCounts, toot) => {
            (0, collection_helpers_1.incrementCount)(tootCounts, toot.account.webfingerURI, -1);
            if (toot.reblog?.account)
                (0, collection_helpers_1.incrementCount)(tootCounts, toot.reblog.account.webfingerURI, -1);
            return tootCounts;
        }, {});
        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        return sortedToots.reduce((scores, toot) => {
            (0, collection_helpers_1.incrementCount)(accountScores, toot.account.webfingerURI);
            scores[toot.uri] = accountScores[toot.account.webfingerURI] || 0;
            if (toot.reblog) {
                (0, collection_helpers_1.incrementCount)(accountScores, toot.reblog.account.webfingerURI);
                scores[toot.uri] += (accountScores[toot.reblog.account.webfingerURI] || 0);
            }
            return scores;
        }, {});
    }
    async _score(toot) {
        const score = this.scoreData[toot.uri] || 0;
        if (score > 0)
            console.warn(`Got positive diversity score of ${score} for toot:`, toot);
        return score;
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map