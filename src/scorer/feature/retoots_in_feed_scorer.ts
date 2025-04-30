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

    // TODO: should this subtract one for the retoot that put the toot in the user's feed?
    async _score(toot: Toot) {
        if (toot.reblog) {
            const reblog = toot.reblog;
            const nonAuthorRetoots = reblog.reblogsBy.filter((acct) => acct.webfingerURI != reblog.account.webfingerURI);
            return Math.pow(nonAuthorRetoots.length, 2);
        } else {
            return 0;
        }
    }
};
