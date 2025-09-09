/**
 * @memberof module:toot_scorers
 */
import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';
import { sumArray } from '../../helpers/collection_helpers';


/**
 * Score based on the {@linkcode numTimesShown}, which is managed by the client app.
 * @class AlreadyShownScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
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
