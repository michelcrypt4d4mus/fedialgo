/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import Account from "../../api/objects/account";
import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
import { countValues } from "../../helpers/collection_helpers";
import { MastoApi } from "../../api/api";
import { StringNumberDict, WeightName } from "../../types";


export default class InteractionsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.INTERACTIONS);
    }

    async featureGetter(): Promise<StringNumberDict> {
        const notifications = await MastoApi.instance.getRecentNotifications();

        return countValues<mastodon.v1.Notification>(
            notifications,
            notif => {
                if (!notif.account?.acct) {
                    console.warn(`No account found in notification: ${JSON.stringify(notif)}`);
                    return "";
                }

                return new Account(notif.account).webfingerURI();
            }
        );
    };

    async _score(toot: Toot) {
        return this.requiredData[toot.account.webfingerURI()] || 0;
    }
};
