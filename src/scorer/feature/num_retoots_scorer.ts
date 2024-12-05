/*
 * Score how many times the toot has been retooted.
 */
import FeatureScorer from '../feature_scorer';
import { Toot } from '../../types';
import { WeightName } from '../../config';


export default class NumRetootsScorer extends FeatureScorer {
    constructor() {
        super({scoreName: WeightName.NUM_RETOOTS});
    }

    async _score(toot: Toot) {
        return toot?.reblogsCount || 0;
    }
};
