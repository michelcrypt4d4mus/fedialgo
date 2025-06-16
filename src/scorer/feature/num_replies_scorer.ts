/*
 * Score how many times the toot has been replied to by other users.
 */
import TootScorer from '../toot_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


export default class NumRepliesScorer extends TootScorer {
    description = "Favour toots with lots of replies";

    constructor() {
        super(ScoreName.NUM_REPLIES);
    }

    async _score(toot: Toot) {
        return toot.realToot.repliesCount || 0;
    }
};
