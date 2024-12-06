/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
import { mastodon } from "masto";

import FeatureScorer from "../feature_scorer";
import MastodonApiCache from "../../api/mastodon_api_cache";
import { Toot } from "../../types";
import { WeightName } from "../../types";


export default class RetootedUsersScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostRetootedAccounts(api),
            scoreName: WeightName.MOST_RETOOTED_ACCOUNTS,
        });
    }

    async _score(toot: Toot) {
        const authorScore = this.feature[toot.account.acct] || 0;
        const retootScore = toot.reblog?.account?.acct ? (this.feature[toot.reblog.account.acct] || 0) : 0;
        return authorScore + retootScore;
    }
};
