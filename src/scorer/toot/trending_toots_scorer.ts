import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


/**
 * Scores with the trendingRank set by getTrendingToots().
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class TrendingTootScorer extends TootScorer {
    description = "Favour toots that are trending in the Fediverse";

    constructor() {
        super(ScoreName.TRENDING_TOOTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.trendingRank || 0;
    }
};
