/*
 * Score how many times the toot has been favorited by other users.
 * Note: favorites don't propagate across servers, so this is only useful for the
 * user's home server.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


// TODO: unclear whether favorites are pulled from servers other than the users' home server
export default class NumFavoritesScorer extends FeatureScorer {
    constructor() {
        super({scoreName: WeightName.NUM_FAVOURITES});
    }

    async _score(toot: Toot) {
        return toot?.favouritesCount || 0;
    }
};
