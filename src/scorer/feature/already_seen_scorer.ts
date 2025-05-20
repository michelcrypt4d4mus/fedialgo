/*
 * Score based on the numTimesShown, which is managed by the client app.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from '../../types';


export default class AlreadyShownScorer extends FeatureScorer {
    constructor() {
        super(WeightName.ALREADY_SHOWN);
    }

    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot: Toot) {
        return -1 * ((toot.numTimesShown || 0) + (toot.reblog?.numTimesShown || 0));
    }
};
