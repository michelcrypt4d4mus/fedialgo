import FeatureScorer from '../FeatureScorer';
import { StatusType, } from "../../types";
import { mastodon } from "masto";

export default class topPostFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (_api: mastodon.rest.Client) => { return Promise.resolve({}) },
            verboseName: "TopPosts",
            description: "Favor posts that are trending in the Fediverse",
            defaultWeight: 1,
        })
    }

    async score(_api: mastodon.rest.Client, status: StatusType) {
        return status.topPost ? 1 : 0
    }
}
