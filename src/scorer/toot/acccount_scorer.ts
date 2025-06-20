/*
 * Abstract extension of FeatureScorer to score a toot based on the account that created it.
 * Requires that the scoreData is a map of webfingerURIs to scores.
 */
import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { sumArray } from '../../helpers/collection_helpers';


/**
 * @private
 */
export default abstract class AccountScorer extends TootScorer {
    async _score(toot: Toot) {
        return sumArray(toot.withRetoot.map(t => this.scoreData[t.account.webfingerURI]));
    };
};
