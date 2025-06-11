/*
 * Abstract extension of FeatureScorer to score a toot based on the account that created it.
 * Requires that the scoreData is a map of webfingerURIs to scores.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { sumArray } from '../../helpers/collection_helpers';


export default abstract class AccountScorer extends FeatureScorer {
    async _score(toot: Toot) {
        return sumArray(toot.withRetoot.map(t => this.scoreData[t.account.webfingerURI]));
    };
};
