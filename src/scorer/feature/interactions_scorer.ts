/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
import { countValues } from "../../helpers";
import { MastoApi } from "../../api/api";
import { StringNumberDict, WeightName } from "../../types";


export default class InteractionsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.INTERACTIONS);
    }

    async featureGetter(): Promise<StringNumberDict> {
        const notifications = await MastoApi.instance.getRecentNotifications();
        return countValues<mastodon.v1.Notification>(notifications, notif => notif?.account?.acct);
    };

    async _score(toot: Toot) {
        return (toot.account.acct in this.requiredData) ? this.requiredData[toot.account.acct] : 0;
    }
};
