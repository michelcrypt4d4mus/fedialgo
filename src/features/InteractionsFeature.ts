/*
 * This feature will return a dictionary with the number of interactions with other accounts in the last
 * pages of notifications.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";
import { mastodonFetchPages } from "../helpers";

const NUM_PAGES_TO_SCAN = 3;
const MIN_RECORDS = 80;


export default async function InteractionsFeature(api: mastodon.rest.Client): Promise<AccountFeature> {
    const results = await mastodonFetchPages<mastodon.v1.Notification>(
        api.v1.notifications.list,
        NUM_PAGES_TO_SCAN,
        MIN_RECORDS
    );

    console.log(`Retrieved notifications with InteractionsFeature() and mastodonFetchPages(): `, results);

    const interactFrequ = results.reduce(
        (interactionCount: Record<string, number>, notification: mastodon.v1.Notification) => {
            if (!notification.account) return interactionCount;
            interactionCount[notification.account.acct] = (interactionCount[notification.account.acct] || 0) + 1;
            return interactionCount;
        },
        {}
    );

    return interactFrequ;
};
