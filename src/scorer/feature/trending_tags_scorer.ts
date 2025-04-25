/*
 * Scores with the number of accounts that have posted a toot with the trending tag
 * across the Fediverse.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class TrendingTagsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.TRENDING_TAGS);
    }

    async _score(toot: Toot) {
        return toot.trendingTags.reduce((sum, tag) => sum + (tag.numAccounts || 0), 0);
    }
};
