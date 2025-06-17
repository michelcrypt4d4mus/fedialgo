import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { config } from '../../config';
import { ScoreName } from '../../enums';
import { sumArray } from '../../helpers/collection_helpers';


/**
 * Scores with the number of accounts that have posted a toot with the trending tag
 * across the Fediverse.
 */
export default class TrendingTagsScorer extends TootScorer {
    description = "Favour hashtags that are trending in the Fediverse";

    constructor() {
        super(ScoreName.TRENDING_TAGS);
    }

    async _score(toot: Toot) {
        const tags = toot.realToot.trendingTags || [];
        const tagScores = tags.map(tag => tag.numAccounts || 0);
        let score = sumArray(tagScores);

        // If the toot is tag spam reduce the score
        if (score > 0 && toot.tags.length >= config.scoring.excessiveTags) {
            this.logger.deep(`Penalizing excessive tags (${toot.tags.length}) in ${toot.description}`);
            score *= config.scoring.excessiveTagsPenalty;
        }

        return score;
    }
};
