/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
import FeatureScorer from '../FeatureScorer';
import { Toot } from "../../types";

export const TRENDING_TOOTS = "TrendingToots";
export const TRENDING_TOOTS_DEFAULT_WEIGHT = 0.08;


// TODO: rename TrendingTootFeatureScorer
export default class TopPostFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots that are trending across the Fediverse",
            defaultWeight: TRENDING_TOOTS_DEFAULT_WEIGHT,
            scoreName: TRENDING_TOOTS,
        });
    }

    async _score(toot: Toot) {
        return toot.trendingRank || 0;
    }
};
