/*
 * Score how many times the toot has been replied to by other users.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class NumRepliesScorer extends FeatureScorer {
    constructor() {
        super(WeightName.NUM_REPLIES);
    }

    async _score(toot: Toot) {
        return (toot.reblog || toot).repliesCount || 0;
    }
};
