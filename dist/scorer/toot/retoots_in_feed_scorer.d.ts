/**
 * @module toot_scorers
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/** Score how many times a toot has been retooted by other accounts in the feed. */
export default class RetootsInFeedScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
