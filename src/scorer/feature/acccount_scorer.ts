/*
 * Abstract extension of FeatureScorer to score a toot based on the account that created it
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';


export default abstract class AccountScorer extends FeatureScorer {
    async _score(toot: Toot) {
        const score = this.scoreData[toot.account.webfingerURI] || 0;
        return score + (toot.reblog ? (this.scoreData[toot.reblog.account.webfingerURI] || 0) : 0);
    };
};
