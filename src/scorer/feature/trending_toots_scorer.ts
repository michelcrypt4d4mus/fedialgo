/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


export default class TrendingTootScorer extends FeatureScorer {
    description = "Favour toots that are trending in the Fediverse";

    constructor() {
        super(ScoreName.TRENDING_TOOTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.trendingRank || 0;
    }
};
