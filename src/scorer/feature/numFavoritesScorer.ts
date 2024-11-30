/*
 * Score how many times the toot has been favorited by other users.
 */
import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';

const SCORE_NAME = "NumFavourites";


// TODO: unclear whether favorites are pulled from servers other than the users' home server
export default class NumFavoritesScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots that have been favourited by a lot of other users",
            defaultWeight: 1,
            scoreName: SCORE_NAME,
        });
    }

    async score(toot: Toot) {
        return toot?.favouritesCount || 0;
    }
};
