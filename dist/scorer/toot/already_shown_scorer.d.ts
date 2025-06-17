import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/**
 * Score based on the numTimesShown, which is managed by the client app.
 * @class
 * @memberof toot_scorers
 */
export default class AlreadyShownScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
