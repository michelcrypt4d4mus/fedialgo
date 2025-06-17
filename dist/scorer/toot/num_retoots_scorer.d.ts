import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/**
 * Score how many times the toot has been retooted.
 * @memberof toot_scorers
 */
export default class NumRetootsScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
