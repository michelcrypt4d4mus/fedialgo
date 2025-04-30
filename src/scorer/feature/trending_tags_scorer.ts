/*
 * Scores with the number of accounts that have posted a toot with the trending tag
 * across the Fediverse.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import Storage from '../../Storage';
import { sumArray } from '../../helpers/collection_helpers';
import { WeightName } from "../../types";


export default class TrendingTagsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.TRENDING_TAGS);
    }

    async _score(toot: Toot) {
        const tagScores = (toot.reblog || toot).trendingTags.map(tag => tag.numAccounts || 0);
        let score = sumArray(tagScores);

        // If the toot is tag spam reduce the score
        if (score > 0 && toot.tags.length >= Storage.getConfig().excessiveTags) {
            console.info(`${this.logPrefix()} Penalizing excessive tags (${toot.tags.length}) in:`, toot);
            score *= Storage.getConfig().excessiveTagsPenalty;
        }

        return score;
    }
};
