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
const collection_helpers_1 = require("../../helpers/collection_helpers");
const types_1 = require("../../types");
class DiversityFeedScorer extends feed_scorer_1.default {
    constructor() {
        super(types_1.WeightName.DIVERSITY);
    }
    feedExtractor(feed) {
        console.debug(`DiversityFeedScorer.feedExtractor() called...`);
        // Shuffle the feed to avoid biasing the scoring based on the order of the feed
        // Count toots by account (but negative instead of positive count)
        // TODO: maybe reverse chronological order would be better?
        const diversityTootsOrdered = (0, collection_helpers_1.shuffle)(feed).reduce((tootCounts, toot) => {
            (0, collection_helpers_1.incrementCount)(tootCounts, toot.account.webfingerURI(), -1);
            if (toot.reblog?.account)
                (0, collection_helpers_1.incrementCount)(tootCounts, toot.reblog.account.webfingerURI(), -1);
            return tootCounts;
        }, {});
        console.debug(`DiversityFeedScorer.feedExtractor() returning: ${JSON.stringify(diversityTootsOrdered, null, 4)}`);
        return diversityTootsOrdered;
    }
    // *NOTE: The penalty for frequent tooters decreases by 1 each time a toot is scored*
    //        As a result this.features must be reset anew each time the feed is scored
    async _score(toot) {
        (0, collection_helpers_1.incrementCount)(this.requiredData, toot.account.webfingerURI());
        if (toot.reblog)
            (0, collection_helpers_1.incrementCount)(this.requiredData, toot.reblog.account.webfingerURI());
        const acct = toot.realAccount().webfingerURI();
        // TODO: this was a hack to avoid wildly overscoring diversity values because of a bug that should be fixed now
        if (this.requiredData[acct] > 0) {
            let msg = `DiversityFeedScorer for ${toot.account.webfingerURI()} scored over 0`;
            msg += ` (got ${this.requiredData[toot.account.webfingerURI()]})`;
            console.warn(`${msg}, diversity features:\n${JSON.stringify(this.requiredData, null, 4)}`);
            return 0;
        }
        else {
            return this.requiredData[acct];
        }
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map