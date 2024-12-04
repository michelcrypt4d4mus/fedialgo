/*
 * Score how many times the toot has been favorited by other users.
 * Note: favorites don't propagate across servers, so this is only useful for the
 * user's home server.
 */
import FeatureScorer from '../feature_scorer';
import { Toot } from '../../types';

const SCORE_NAME = "NumFavourites";


// TODO: unclear whether favorites are pulled from servers other than the users' home server
export default class NumFavoritesScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour things favourited by users on your home server",
            scoreName: SCORE_NAME,
        });
    }

    async _score(toot: Toot) {
        return toot?.favouritesCount || 0;
    }
};
