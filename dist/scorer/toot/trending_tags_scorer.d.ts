import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/**
 * Scores with the number of accounts that have posted a toot with the trending tag
 * across the Fediverse.
 */
export default class TrendingTagsScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
