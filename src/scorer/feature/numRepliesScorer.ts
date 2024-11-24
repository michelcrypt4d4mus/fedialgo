/*
 * Score how many times the toot has been replied to by other users.
 */
import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';

const SCORE_NAME = "NumReplies"


export default class NumRepliesScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots that have been replied to many times",
            defaultWeight: 1,
            scoreName: SCORE_NAME,
        })
    }

    async score(toot: Toot) {
        return toot?.repliesCount || 0;
    }
};
