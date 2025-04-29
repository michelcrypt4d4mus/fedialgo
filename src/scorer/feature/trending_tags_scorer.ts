/*
 * Scores with the number of accounts that have posted a toot with the trending tag
 * across the Fediverse.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import Storage from '../../Storage';
import { WeightName } from "../../types";

const EXCESSIVE_TAGS_PENALTY = 0.1;


export default class TrendingTagsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.TRENDING_TAGS);
    }

    async _score(toot: Toot) {
        let score = (toot.reblog || toot).trendingTags.reduce((sum, tag) => sum + (tag.numAccounts || 0), 0);

        if (score > 0 && toot.tags.length >= Storage.getConfig().excessiveTags) {
            console.info(`[${this.constructor.name}] Penalizing excessive tags (${toot.tags.length}) in toot:`, toot);
            score *= EXCESSIVE_TAGS_PENALTY;
        }

        return score;
    }
};
