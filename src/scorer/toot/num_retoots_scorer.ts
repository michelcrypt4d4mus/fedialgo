import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


/**
 * Score how many times the toot has been retooted.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class NumRetootsScorer extends TootScorer {
    description = "Favour toots that are retooted a lot";

    constructor() {
        super(ScoreName.NUM_RETOOTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.reblogsCount || 0;
    }
};
