import { mastodon } from "masto";

import FeatureScorer from '../FeatureScorer';
import { StatusType, } from "../../types";

export const TOP_POSTS = "topPosts";
export const TOP_POSTS_DEFAULT_WEIGHT = 0.1;


export default class topPostFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (_api: mastodon.rest.Client) => { return Promise.resolve({}) },
            verboseName: TOP_POSTS,
            description: "Favor posts that are trending in the Fediverse",
            defaultWeight: TOP_POSTS_DEFAULT_WEIGHT,
        });
    }

    async score(_api: mastodon.rest.Client, status: StatusType) {
        return status.topPost || 0;  // TODO: rename topPostRank
    }
};
