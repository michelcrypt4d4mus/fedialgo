/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
import { mastodon } from "masto";

import FeatureScorer from "../FeatureScorer";
import MastodonApiCache from "../../features/mastodon_api_cache";
import { Key } from '../../Storage';
import { Toot } from "../../types";

const DEFAULT_RETOOTED_USER_WEIGHT = 3;


// TODO: rename retootedUsersFeatureScorer
export default class reblogsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots from accounts you have retooted a lot",
            defaultWeight: DEFAULT_RETOOTED_USER_WEIGHT,
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostRetootedAccounts(api),
            scoreName: Key.TOP_REBLOGS,
        });
    }

    async score(toot: Toot) {
        const authorScore = this.feature[toot.account.acct] || 0;
        const retootScore = toot.reblog?.account?.acct ? (this.feature[toot.reblog.account.acct] || 0) : 0;
        return authorScore + retootScore;
    }
};
