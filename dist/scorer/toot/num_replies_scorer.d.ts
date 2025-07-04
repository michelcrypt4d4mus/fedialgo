import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * Score how many times the toot has been replied to by other users.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class NumRepliesScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
