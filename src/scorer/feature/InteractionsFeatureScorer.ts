/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../feature_scorer";
import MastodonApiCache from "../../api/mastodon_api_cache";
import { Toot } from "../../types";
import { WeightName } from "../../types";


export default class InteractionsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getTopInteracts(api),
            scoreName: WeightName.INTERACTIONS,
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
};
