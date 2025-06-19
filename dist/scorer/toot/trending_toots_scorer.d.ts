import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * Scores with the trendingRank set by getTrendingToots().
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class TrendingTootScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
