import FeatureScorer from '../FeatureScorer';
import { mastodon } from "masto";
import { StatusType, } from "../../types";

export const TOP_POSTS = "topPosts";


export default class topPostFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (_api: mastodon.rest.Client) => { return Promise.resolve({}) },
            verboseName: TOP_POSTS,
            description: "Favor posts that are trending in the Fediverse",
            defaultWeight: 1,
        })
    }

    async score(_api: mastodon.rest.Client, status: StatusType) {
        return status.topPost || 0;  // TODO: rename topPostRank
    }
};
