import { mastodon } from "masto";

import FeatureScorer from '../FeatureScorer';
import { StatusType, } from "../../types";

export const TRENDING_POSTS = "topPosts";
export const TRENDING_POSTS_DEFAULT_WEIGHT = 0.1;


export default class topPostFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (_api: mastodon.rest.Client) => { return Promise.resolve({}) },
            verboseName: TRENDING_POSTS,
            description: "Favor posts that are trending in the Fediverse",
            defaultWeight: TRENDING_POSTS_DEFAULT_WEIGHT,
        });
    }

    // TODO: rename topPostRank
    async score(_api: mastodon.rest.Client, toot: StatusType) {
        return toot.topPost || 0;
    }
};
