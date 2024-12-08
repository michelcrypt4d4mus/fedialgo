/*
 * Score how many times the user has replied to the author of the toot.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import MastodonApiCache from '../../api/mastodon_api_cache';
import { getUserRecentToots } from '../../api/api';
import { Toot, WeightName } from '../../types';



export default class MostRepliedAccountsScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostRepliedAccounts(api),
            scoreName: WeightName.MOST_REPLIED_ACCOUNTS,
        });
    }

    async _score(toot: Toot) {
        return this.feature[toot.account.id] || 0;
    }

    static async fetchRequiredData(
        api: mastodon.rest.Client,
        user: mastodon.v1.Account,
        recentToots?: mastodon.v1.Status[]
    ): Promise<Record<string, number>> {
        recentToots ||= await getUserRecentToots(api, user);
        const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
        console.log(`Recent reply history: `, recentReplies);

        // Count replied per user. Note that this does NOT pull the Account object because that
        // would require a lot of API calls, so it's just working with the account ID which is NOT
        // unique across all servers.
        return recentReplies.reduce(
            (counts: Record<string, number>, toot: mastodon.v1.Status) => {
                if (!toot?.inReplyToAccountId) return counts;
                counts[toot.inReplyToAccountId] = (counts[toot.inReplyToAccountId] || 0) + 1;
                return counts;
            },
            {}
        );
    };
};
