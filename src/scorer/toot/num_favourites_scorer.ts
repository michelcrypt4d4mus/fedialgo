import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


/**
 * Score how many times the toot has been favourited by other users.
 * Note: favorites don't propagate across servers, so this is only useful for the
 * user's home server.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class NumFavouritesScorer extends TootScorer {
    description = "Favour toots favourited by your server's users";

    constructor() {
        super(ScoreName.NUM_FAVOURITES);
    }

    async _score(toot: Toot) {
        return toot.realToot.favouritesCount || 0;
    }
};
