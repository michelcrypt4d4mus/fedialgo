"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
const blueimp_md5_1 = __importDefault(require("blueimp-md5"));
const feed_scorer_1 = __importDefault(require("../feed_scorer"));
const types_1 = require("../../types");
class DiversityFeedScorer extends feed_scorer_1.default {
    constructor() {
        super(types_1.WeightName.DIVERSITY);
    }
    feedExtractor(feed) {
        // Shuffle the feed before penalizing multiple tooters
        // TODO: maybe reverse chronological order would be better?
        console.log(`DiversityFeedScorer.feedExtractor() called...`);
        const sortRandom = (a, b) => (0, blueimp_md5_1.default)(a.id).localeCompare((0, blueimp_md5_1.default)(b.id));
        // Count toots by account (but negative instead of positive count)
        const diversityTootsOrdered = feed.toSorted(sortRandom).reduce((tootCounts, toot) => {
            tootCounts[toot.account.acct] = (tootCounts[toot.account.acct] || 0) - 1;
            return tootCounts;
        }, {});
        console.log(`DiversityFeedScorer.feedExtractor() returning: ${JSON.stringify(diversityTootsOrdered, null, 4)}`);
        return diversityTootsOrdered;
    }
    // *NOTE: The penalty for frequent tooters decreases by 1 each time a toot is scored*
    //        As a result this.features must be reset anew each time the feed is scored
    async _score(toot) {
        this.feed[toot.account.acct] = (this.feed[toot.account.acct] || 0) + 1;
        // TODO: this was a hack to avoid wildly overscoring diversity values because of a bug that should be fixed now
        if (this.feed[toot.account.acct] > 0) {
            console.log(`DiversityFeedScorer for ${toot.account.acct} has score over 0 (${this.feed[toot.account.acct]}), diversity features:`, this.feed);
            return 0;
        }
        else {
            return this.feed[toot.account.acct];
        }
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map