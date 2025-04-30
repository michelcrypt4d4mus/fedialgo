/*
 * Score how many times the toot has been retooted.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class NumRetootsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.NUM_RETOOTS);
    }

    async _score(toot: Toot) {
        return toot.realToot().reblogsCount || 0;
    }
};
