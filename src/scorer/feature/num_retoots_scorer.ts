/*
 * Score how many times the toot has been retooted.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from "../../types";


export default class NumRetootsScorer extends FeatureScorer {
    description = "Favour toots that are retooted a lot";

    constructor() {
        super(ScoreName.NUM_RETOOTS);
    }

    async _score(toot: Toot) {
        return toot.realToot().reblogsCount || 0;
    }
};
