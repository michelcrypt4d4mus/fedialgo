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

    console.debug(`Retrieved notifications with InteractionsFeature() and mastodonFetchPages(): `, results);

    return results.reduce(
        (interactionCount: Record<string, number>, notification: mastodon.v1.Notification) => {
            if (!notification.account) return interactionCount;
            const account = notification.account.acct;
            interactionCount[account] = (interactionCount[account] || 0) + 1;
            return interactionCount;
        },
        {}
    );
};
