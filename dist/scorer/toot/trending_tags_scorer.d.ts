import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * Scores with the number of accounts that have posted a {@linkcode Toot} with the trending tag
 * across the Fediverse.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class TrendingTagsScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
