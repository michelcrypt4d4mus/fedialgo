/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import { mastodon } from "masto";

import Account from "../../api/objects/account";
import AccountScorer from "../acccount_scorer";
import { countValues } from "../../helpers/collection_helpers";
import { MastoApi } from "../../api/api";
import { StringNumberDict, WeightName } from "../../types";


export default class InteractionsScorer extends AccountScorer {
    constructor() {
        super(WeightName.INTERACTIONS);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        const notifications = await MastoApi.instance.getRecentNotifications();

        return countValues<mastodon.v1.Notification>(
            notifications,
            notif => {
                if (!notif.account?.acct) {
                    console.warn(`No account found in notification: ${JSON.stringify(notif)}`);
                    return "NO_ACCOUNT";
                }

                return new Account(notif.account).webfingerURI;
            }
        );
    };
};
