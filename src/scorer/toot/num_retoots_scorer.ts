import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { ScoreName } from '../../enums';


/** Score how many times the toot has been retooted. */
export default class NumRetootsScorer extends TootScorer {
    description = "Favour toots that are retooted a lot";

    constructor() {
        super(ScoreName.NUM_RETOOTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.reblogsCount || 0;
    }
};
