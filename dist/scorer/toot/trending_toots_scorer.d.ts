/**
 * @module scorers
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/** Scores with the trendingRank set by getTrendingToots(). */
export default class TrendingTootScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
