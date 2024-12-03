/*
 * Computes the number of accounts that have interacted with a toot's trending tags
 */
import FeatureScorer from '../FeatureScorer';
import { Toot, TrendingTag } from "../../types";

export const TRENDING_TAGS = "TrendingTags";
export const TRENDING_TAGS_DEFAULT_WEIGHT = 0.06;


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
        return tags.reduce((sum, tag) => sum + (tag.numAccounts || 0), 0);
    }
};


// TODO: unused
function logNumAccounts(tag: TrendingTag): number {
    const numAccounts = tag.numAccounts || Math.E;
    let score = 0;

    if (numAccounts >= Math.E) {
        score = 1 + Math.log(numAccounts);
    } else if (numAccounts >= 1) {
        score = numAccounts;
    }

    console.debug(`[TrendingTags] score: ${score} for tag:`, tag);
    return score;
}
