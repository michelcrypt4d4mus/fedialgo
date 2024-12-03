/*
 * Score how many times the toot has been replied to by other users.
 */
import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';

const SCORE_NAME = "NumReplies";


export default class NumRepliesScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots with lots of replies",
            defaultWeight: 1,
            scoreName: SCORE_NAME,
        });
    }

    async _score(toot: Toot) {
        return toot?.repliesCount || 0;
    }
};
