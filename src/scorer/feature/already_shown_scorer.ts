/*
 * Score based on the numTimesShown, which is managed by the client app.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


export default class AlreadyShownScorer extends FeatureScorer {
    description = 'Favour toots marked as already seen';

    constructor() {
        super(ScoreName.ALREADY_SHOWN);
    }

    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot: Toot) {
        return (toot.numTimesShown || 0) + (toot.reblog?.numTimesShown || 0);
    }
};
