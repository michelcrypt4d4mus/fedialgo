import FeatureScorer from '../FeatureScorer';
import { Toot } from "../../types";

export const TRENDING_TOOTS = "TrendingToots";
export const TRENDING_TOOTS_DEFAULT_WEIGHT = 0.1;


// TODO: rename TrendingTootFeatureScorer
export default class TopPostFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favor toots that are trending in the Fediverse from accounts you don't follow",
            defaultWeight: TRENDING_TOOTS_DEFAULT_WEIGHT,
            scoreName: TRENDING_TOOTS,
        });
    }

    async score(toot: Toot) {
        return toot.trendingRank || 0;
    }
};
