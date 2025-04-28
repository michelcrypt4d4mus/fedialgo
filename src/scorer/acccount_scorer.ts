/*
 * Abstract extension of FeatureScorer to score a toot based on the account that created it
 */
import FeatureScorer from './feature_scorer';
import Toot from './../api/objects/toot';


export default class AccountScorer extends FeatureScorer {
    async _score(toot: Toot) {
        const score = this.requiredData[toot.account.webfingerURI()] || 0;
        return score + (toot.reblog ? (this.requiredData[toot.reblog.account.webfingerURI()] || 0) : 0);
    };
};
