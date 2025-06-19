/**
 * @memberof module:toot_scorers
 */
import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * Random number generator to mix up the feed.
 * @class ChaosScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class ChaosScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
    private decimalHash;
}
