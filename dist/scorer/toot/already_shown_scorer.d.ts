/**
 * @memberof module:toot_scorers
 */
import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * Score based on the numTimesShown, which is managed by the client app.
 * @class AlreadyShownScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class AlreadyShownScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
