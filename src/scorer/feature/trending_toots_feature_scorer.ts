/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
import FeatureScorer from '../feature_scorer';
import { Toot } from "../../types";
import { WeightName } from '../../config';

export const TRENDING_TOOTS_DEFAULT_WEIGHT = 0.08;


export default class TrendingTootFeatureScorer extends FeatureScorer {
    constructor() {
        super({scoreName: WeightName.TRENDING_TOOTS});
    }

    async _score(toot: Toot) {
        return toot.trendingRank || 0;
    }
};
