"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
const FeedScorer_1 = __importDefault(require("../FeedScorer"));
class DiversityFeedScorer extends FeedScorer_1.default {
    constructor() {
        super("Diversity", "Disfavour toots from users that are cluttering up your feed with a lot of toots");
    }
    feedExtractor(feed) {
        // Shuffle the feed before penalizing multiple tooters
        // TODO: maybe reverse chronological order would be better?
        console.log(`DiversityFeedScorer.feedExtractor() called...`);
        const sortRandom = () => Math.random() - 0.5;
        return feed.toSorted(sortRandom).reduce((userTootCounts, toot) => {
            userTootCounts[toot.account.acct] = (userTootCounts[toot.account.acct] || 0) - 1;
            return userTootCounts;
        }, {});
    }
    // *NOTE: the penalty for frequent tooters decreases by 1 each time a toot is scored*
    //        As a result this.features must be reset anew each time the feed is scored
    async score(toot) {
        super.score(toot); // Check if ready?
        this.features[toot.account.acct] += 1;
        console.debug(`DiversityFeedScorer: ${toot.account.acct} has ${this.features[toot.account.acct]} toots, diversity features:`, this.features);
        return this.features[toot.account.acct];
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversityFeedScorer.js.map