"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const types_1 = require("../../types");
class RetootsInFeedScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.RETOOTED_IN_FEED);
    }
    async _score(toot) {
        if (toot.reblog) {
            const reblog = toot.reblog;
            const nonAuthorRetoots = reblog.reblogsBy.filter((acct) => acct.webfingerURI != reblog.account.webfingerURI);
            let retootCount = nonAuthorRetoots.length;
            if (toot.reblog.isFollowed)
                retootCount += 1; // add 1 if both reblog & toot are followed accounts
            retootCount -= 1; // Subtract 1 so that normal retoots aren't boosted unnecessarily
            if (retootCount < 0) {
                console.warn(`[${this.constructor.name}] Negative retoot count ${retootCount} for toot:`, toot);
                return 0;
            }
            return Math.pow(retootCount, 2);
        }
        else {
            return 0;
        }
    }
}
exports.default = RetootsInFeedScorer;
;
//# sourceMappingURL=retoots_in_feed_scorer.js.map