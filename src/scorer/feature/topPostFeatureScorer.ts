import { mastodon } from "masto";

import FeatureScorer from '../FeatureScorer';
import { Toot } from "../../types";

export const TRENDING_POSTS = "topPosts";
export const TRENDING_POSTS_DEFAULT_WEIGHT = 0.1;


export default class TopPostFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favor posts that are trending in the Fediverse",
            defaultWeight: TRENDING_POSTS_DEFAULT_WEIGHT,
            scoreName: TRENDING_POSTS,
        });
    }

    // TODO: rename topPostRank
    async score(toot: Toot) {
        return toot.topPost || 0;
    }
};
