/*
 * Score how many times the toot has been replied to by other users.
 */
import FeatureScorer from '../feature_scorer';
import { Toot } from '../../types';
import { WeightName } from '../../config';


export default class NumRepliesScorer extends FeatureScorer {
    constructor() {
        super({scoreName: WeightName.NUM_REPLIES});
    }

    async _score(toot: Toot) {
        return toot?.repliesCount || 0;
    }
};
