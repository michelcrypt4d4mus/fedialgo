/**
 * @module toot_scorers
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/** Random number generator to mix up the feed. */
export default class ChaosScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
    private decimalHash;
}
