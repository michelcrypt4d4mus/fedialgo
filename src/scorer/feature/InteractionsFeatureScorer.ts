/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../FeatureScorer";
import FeatureStorage from "../../features/FeatureStore";
import { Toot } from "../../types";

const INTERACTIONS_DEFAULT_WEIGHT = 2;
const SCORE_NAME = "Interactions";


export default class InteractionsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favor toots from users that most frequently interact with your posts",
            defaultWeight: INTERACTIONS_DEFAULT_WEIGHT,
            featureGetter: (api: mastodon.rest.Client) => FeatureStorage.getTopInteracts(api),
            scoreName: SCORE_NAME,
        });
    }

    async score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
};
