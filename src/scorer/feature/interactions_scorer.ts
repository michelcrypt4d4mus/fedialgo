/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
import { AccountFeature, WeightName } from "../../types";
import { countValues } from "../../helpers";
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
        const notifications = await MastoApi.instance.getRecentNotifications();
        return countValues<mastodon.v1.Notification>(notifications, n => n?.account?.acct);
    };
};
