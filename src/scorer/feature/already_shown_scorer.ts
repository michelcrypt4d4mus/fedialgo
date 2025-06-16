/*
 * Score based on the numTimesShown, which is managed by the client app.
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../feature_scorer';
import { ScoreName } from '../../enums';
import { sumArray } from '../../helpers/collection_helpers';


export default class AlreadyShownScorer extends TootScorer {
    description = 'Favour toots marked as already seen';

    constructor() {
        super(ScoreName.ALREADY_SHOWN);
    }

    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot: Toot) {
        return sumArray(toot.withRetoot.map(t => t.numTimesShown));
    }
};
