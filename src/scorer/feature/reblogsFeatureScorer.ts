import { mastodon } from "masto";

import FeatureScorer from "../FeatureScorer";
import FeatureStorage from "../../features/FeatureStore";
import { StatusType } from "../../types";

const DEFAULT_RETOOTED_USER_WEIGHT = 3;


export default class reblogsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => { return FeatureStorage.getTopReblogs(api) },
            verboseName: "Reblogs",
            description: "Favor posts from accounts you have retooted a lot",
            defaultWeight: DEFAULT_RETOOTED_USER_WEIGHT,
        })
    }

    async score(_api: mastodon.rest.Client, toot: StatusType) {
        const authorScore = (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
        const reblogScore = (toot.reblog && toot.reblog.account.acct in this.feature) ? this.feature[toot.reblog.account.acct] : 0;
        return authorScore + reblogScore;
    }
};
