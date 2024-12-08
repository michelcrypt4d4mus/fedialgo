/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../feature_scorer";
import MastodonApiCache from "../../api/mastodon_api_cache";
import { AccountFeature, Toot, WeightName } from "../../types";
import { mastodonFetchPages } from "../../api/api";


export default class InteractionsScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostFrequentlyInteractingUsers(api),
            scoreName: WeightName.INTERACTIONS,
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }

    static async fetchRequiredData(
        api: mastodon.rest.Client,
        _user: mastodon.v1.Account
    ): Promise<AccountFeature> {
        const results = await mastodonFetchPages<mastodon.v1.Notification>({
            fetch: api.v1.notifications.list,
            label: 'notifications'
        });

        console.log(`Retrieved ${results.length} notifications for InteractionsScorer: `, results);

        return results.reduce(
            (interactionCount: Record<string, number>, notification: mastodon.v1.Notification) => {
                const account = notification?.account?.acct;
                if (!account) return interactionCount;

                interactionCount[account] = (interactionCount[account] || 0) + 1;
                return interactionCount;
            },
            {}
        );
    };
};
