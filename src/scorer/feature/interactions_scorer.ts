/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
import { AccountFeature, WeightName } from "../../types";
import { MastoApi } from "../../api/api";


export default class InteractionsScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: () => InteractionsScorer.fetchRequiredData(),
            scoreName: WeightName.INTERACTIONS,
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }

    static async fetchRequiredData(): Promise<AccountFeature> {
        const results = await MastoApi.instance.getRecentNotifications();
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
