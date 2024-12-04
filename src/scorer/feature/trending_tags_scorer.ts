/*
 * Scores with the log2 of the number of accounts that have interacted with a toot's
 * trending tags across the Fediverse.
 */
import FeatureScorer from '../feature_scorer';
import { Toot, TrendingTag } from "../../types";

export const TRENDING_TAGS = "TrendingTags";
export const TRENDING_TAGS_DEFAULT_WEIGHT = 0.4;


export default class TrendingTagsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour hashtags that are trending in the Fediverse",
            defaultWeight: TRENDING_TAGS_DEFAULT_WEIGHT,
            scoreName: TRENDING_TAGS,
        });
    }

    // TODO: we could also use tag.numStatuses in some way (or instead)
    async _score(toot: Toot) {
        const tags = toot.trendingTags || [];
        const tagScore = tags.reduce((sum, tag) => sum + this.scoreTag(tag), 0);
        // console.debug(`[TrendingTagsFeatureScorer] Scored ${tagScore} for toot w/${toot.trendingTags?.length} trending tags:`, toot);
        return tagScore;
    }

    private scoreTag(tag: TrendingTag): number {
        const numAccounts = tag.numAccounts || Math.E;
        let score = 0;

        if (numAccounts >= Math.E) {
            score = 1 + Math.log2(numAccounts);
        } else if (numAccounts >= 1) {
            score = numAccounts;
        }

        return score;
    }
};