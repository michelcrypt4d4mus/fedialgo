/**
 * @module scorers
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { ScoreName } from '../../enums';


/** Scores with the trendingRank set by getTrendingToots(). */
export default class TrendingTootScorer extends TootScorer {
    description = "Favour toots that are trending in the Fediverse";

    constructor() {
        super(ScoreName.TRENDING_TOOTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.trendingRank || 0;
    }
};
