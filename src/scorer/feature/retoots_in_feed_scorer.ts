/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class RetootsInFeedScorer extends FeatureScorer {
    constructor() {
        super(WeightName.RETOOTED_IN_FEED);
    }

    async _score(toot: Toot) {
        if (toot.reblog) {
            const reblog = toot.reblog;
            const nonAuthorRetoots = reblog.reblogsBy.filter((acct) => acct.webfingerURI != reblog.account.webfingerURI);
            let retootCount = nonAuthorRetoots.length;
            if (toot.reblog.isFollowed) retootCount += 1;  // add 1 if both reblog & toot are followed accounts
            retootCount -= 1;  // Subtract 1 so that normal retoots aren't boosted unnecessarily

            if (retootCount < 0) {
                console.warn(`[${this.constructor.name}] Negative retoot count ${retootCount} for toot:`, toot);
                return 0;
            }

            return Math.pow(retootCount, 2);
        } else {
            return 0;
        }
    }
};
