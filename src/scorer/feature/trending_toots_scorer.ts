/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class TrendingTootScorer extends FeatureScorer {
    constructor() {
        super(WeightName.TRENDING_TOOTS);
    }

    async _score(toot: Toot) {
        return toot.trendingRank || 0;
    }
};
