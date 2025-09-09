import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * Score how many times the {@linkcode Toot} has been retooted.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class NumRetootsScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
