/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../FeatureScorer";
import FeatureStorage from "../../features/FeatureStore";
import { Toot } from "../../types";

const INTERACTIONS_DEFAULT_WEIGHT = 2;


export default class InteractionsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favor posts from users that most frequently interact with your posts",
            defaultWeight: INTERACTIONS_DEFAULT_WEIGHT,
            featureGetter: (api: mastodon.rest.Client) => FeatureStorage.getTopInteracts(api),
            scoreName: "Interacts",
        });
    }

    async score(_api: mastodon.rest.Client, toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
};
