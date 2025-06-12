/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


export default class RetootsInFeedScorer extends FeatureScorer {
    description = "Favour toots retooted by accounts you follow";

    constructor() {
        super(ScoreName.RETOOTED_IN_FEED);
    }

    async _score(toot: Toot) {
        if (!toot.reblog) return 0;

        // add 1 if both reblog & toot are followed accounts
        const reblog = toot.reblog;
        let retootCount = reblog.account.isFollowed ? 1 : 0;
        const nonAuthorRetoots = reblog.reblogsBy.filter((account) => account.webfingerURI != reblog.account.webfingerURI);
        retootCount += nonAuthorRetoots.length;

        // If retootsCount is 1 that's a normal retoot so we score it zero, otherwise return the square of retootCount
        return retootCount <= 1 ? 0 : Math.pow(retootCount, 2);
    }
};
