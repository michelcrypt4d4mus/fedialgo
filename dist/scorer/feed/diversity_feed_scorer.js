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
const config_1 = require("../../config");
class DiversityFeedScorer extends feed_scorer_1.default {
    constructor() {
        super(config_1.WeightName.DIVERSITY);
    }
    feedExtractor(feed) {
        // Shuffle the feed before penalizing multiple tooters
        // TODO: maybe reverse chronological order would be better?
        console.log(`DiversityFeedScorer.feedExtractor() called...`);
        const sortRandom = () => Math.random() - 0.5;
        // Count toots by account (but negative instead of positive count)
        return feed.toSorted(sortRandom).reduce((tootCounts, toot) => {
            tootCounts[toot.account.acct] = (tootCounts[toot.account.acct] || 0) - 1;
            return tootCounts;
        }, {});
    }
    // *NOTE: The penalty for frequent tooters decreases by 1 each time a toot is scored*
    //        As a result this.features must be reset anew each time the feed is scored
    async _score(toot) {
        this.features[toot.account.acct] = (this.features[toot.account.acct] || 0) + 1;
        // TODO: this was a hack to avoid wildly overscoring diversity values because of a bug that should be fixed now
        if (this.features[toot.account.acct] > 0) {
            console.log(`DiversityFeedScorer for ${toot.account.acct} has score over 0 (${this.features[toot.account.acct]}), diversity features:`, this.features);
            return 0;
        }
        else {
            return this.features[toot.account.acct];
        }
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map