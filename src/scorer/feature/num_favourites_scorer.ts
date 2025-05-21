/*
 * Score how many times the toot has been favourited by other users.
 * Note: favorites don't propagate across servers, so this is only useful for the
 * user's home server.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from "../../types";


export default class NumFavouritesScorer extends FeatureScorer {
    description = "Favour toots favourited by your server's users";

    constructor() {
        super(ScoreName.NUM_FAVOURITES);
    }

    async _score(toot: Toot) {
        return toot.realToot().favouritesCount || 0;
    }
};
