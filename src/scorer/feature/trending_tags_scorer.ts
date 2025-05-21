/*
 * Scores with the number of accounts that have posted a toot with the trending tag
 * across the Fediverse.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { config } from '../../config';
import { sumArray } from '../../helpers/collection_helpers';
import { traceLog } from '../../helpers/log_helpers';
import { ScoreName } from "../../types";


export default class TrendingTagsScorer extends FeatureScorer {
    description = "Favour hashtags that are trending in the Fediverse";

    constructor() {
        super(ScoreName.TRENDING_TAGS);
    }

    async _score(toot: Toot) {
        const tags = toot.realToot().trendingTags || [];
        const tagScores = tags.map(tag => tag.numAccounts || 0);
        let score = sumArray(tagScores);

        // If the toot is tag spam reduce the score
        if (score > 0 && toot.tags.length >= config.scoring.excessiveTags) {
            traceLog(`${this.logPrefix()} Penalizing excessive tags (${toot.tags.length}) in ${toot.describe()}`);
            score *= config.scoring.excessiveTagsPenalty;
        }

        return score;
    }
};
