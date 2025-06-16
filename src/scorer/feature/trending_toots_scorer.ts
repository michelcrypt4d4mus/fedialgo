/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../feature_scorer';
import { ScoreName } from '../../enums';


export default class TrendingTootScorer extends TootScorer {
    description = "Favour toots that are trending in the Fediverse";

    constructor() {
        super(ScoreName.TRENDING_TOOTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.trendingRank || 0;
    }
};
