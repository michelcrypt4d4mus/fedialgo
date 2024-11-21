import FeatureScorer from "../FeatureScorer";
import { StatusType } from "../../types";
import { mastodon } from "masto";
import FeatureStorage from "../../features/FeatureStore";

export default class reblogsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => { return FeatureStorage.getTopReblogs(api) },
            verboseName: "Reblogs",
            description: "Favor posts from accounts you have retooted a lot",
            defaultWeight: 3,
        })
    }

    async score(_api: mastodon.rest.Client, status: StatusType) {
        const authorScore = (status.account.acct in this.feature) ? this.feature[status.account.acct] : 0
        const reblogScore = (status.reblog && status.reblog.account.acct in this.feature) ? this.feature[status.reblog.account.acct] : 0
        return authorScore + reblogScore
    }
}
