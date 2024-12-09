/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
import { mastodon } from "masto";

import FeatureScorer from "../feature_scorer";
import MastodonApiCache from "../../api/mastodon_api_cache";
import Toot from '../../api/objects/toot';
import { getUserRecentToots } from "../../api/api";
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

    static async fetchRequiredData(
        api: mastodon.rest.Client,
        user: mastodon.v1.Account,
        recentToots?: mastodon.v1.Status[]
    ): Promise<Record<string, number>> {
        recentToots ||= await getUserRecentToots(api, user);
        const recentRetoots = recentToots.filter(toot => toot?.reblog);
        console.log(`Recent toot history: `, recentToots);
        console.log(`Recent retoot history: `, recentRetoots);

        // Count retoots per user
        return recentRetoots.reduce(
            (counts: Record<string, number>, toot: mastodon.v1.Status) => {
                const retootOfAccount = toot?.reblog?.account?.acct;
                if (!retootOfAccount) return counts;

                counts[retootOfAccount] = (counts[retootOfAccount] || 0) + 1;
                return counts;
            },
            {}
        );
    };
};
