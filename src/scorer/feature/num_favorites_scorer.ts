/*
 * Score how many times the toot has been favourited by other users.
 * Note: favorites don't propagate across servers, so this is only useful for the
 * user's home server.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class NumFavoritesScorer extends FeatureScorer {
    constructor() {
        super(WeightName.NUM_FAVOURITES);
    }

    async _score(toot: Toot) {
        return (toot.reblog || toot).favouritesCount || 0;
    }
};
