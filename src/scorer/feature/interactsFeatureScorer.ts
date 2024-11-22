/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../FeatureScorer";
import FeatureStorage from "../../features/FeatureStore";
import { StatusType } from "../../types";

const INTERACTIONS_DEFAULT_WEIGHT = 2;


export default class interactsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => { return FeatureStorage.getTopInteracts(api) },
            verboseName: "Interacts",
            description: "Favor posts from users that most frequently interact with your posts",
            defaultWeight: INTERACTIONS_DEFAULT_WEIGHT,
        });
    }

    async score(_api: mastodon.rest.Client, status: StatusType) {
        return (status.account.acct in this.feature) ? this.feature[status.account.acct] : 0;
    }
};
