/*
 * Score how many times the toot has been retooted.
 */
import FeatureScorer from '../feature_scorer';
import { Toot } from '../../types';

const SCORE_NAME = "NumRetoots";


export default class NumRetootsScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour oft retooted toots",
            scoreName: SCORE_NAME,
        });
    }

    async _score(toot: Toot) {
        return toot?.reblogsCount || 0;
    }
};
