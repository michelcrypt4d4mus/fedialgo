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
class diversityFeedScorer extends FeedScorer_1.default {
    constructor() {
        super("Diversity", "Disfavour toots from users that are cluttering up your feed with a lot of toots");
    }
    feedExtractor(feed) {
        const sortRandom = () => Math.random() - 0.5; // this prevents just always the first post from being shown
        return feed.sort(sortRandom).reduce((userTootCounts, toot) => {
            userTootCounts[toot.account.acct] = (userTootCounts[toot.account.acct] || 0) - 1;
            return userTootCounts;
        }, {});
    }
    // Note that the penalty for frequent tooters decreases by 1 each time a toot is scored
    async score(toot) {
        super.score(toot); // Check if ready
        this.features[toot.account.acct] += 1;
        return this.features[toot.account.acct];
    }
}
exports.default = diversityFeedScorer;
;
//# sourceMappingURL=diversityFeedScorer.js.map