/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../FeatureScorer";
import MastodonApiCache from "../../features/mastodon_api_cache";
import { Key } from '../../Storage';
import { Toot } from "../../types";

const INTERACTIONS_DEFAULT_WEIGHT = 2;


export default class InteractionsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots from users that interact with your toots",
            defaultWeight: INTERACTIONS_DEFAULT_WEIGHT,
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getTopInteracts(api),
            scoreName: Key.TOP_INTERACTS,
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
};
