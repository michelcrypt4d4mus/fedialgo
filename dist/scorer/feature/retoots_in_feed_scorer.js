"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const scorer_1 = require("../scorer");
class RetootsInFeedScorer extends feature_scorer_1.default {
    description = "Favour toots retooted by accounts you follow";
    constructor() {
        super(scorer_1.ScoreName.RETOOTED_IN_FEED);
    }
    async _score(toot) {
        if (!toot.reblog)
            return 0;
        // add 1 if both reblog & toot are followed accounts
        const reblog = toot.reblog;
        let retootCount = reblog.account.isFollowed ? 1 : 0;
        const nonAuthorRetoots = reblog.reblogsBy.filter((acct) => acct.webfingerURI != reblog.account.webfingerURI);
        retootCount += nonAuthorRetoots.length;
        // If retootsCount is 1 that's a normal retoot so we score it zero, otherwise return the square of retootCount
        return retootCount <= 1 ? 0 : Math.pow(retootCount, 2);
    }
}
exports.default = RetootsInFeedScorer;
;
//# sourceMappingURL=retoots_in_feed_scorer.js.map