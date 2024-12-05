/*
 * This feature will return a dictionary with the number of interactions with other accounts in the last
 * pages of notifications.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";
import { mastodonFetchPages } from "../api/api";


export default async function InteractionsFeature(
    api: mastodon.rest.Client,
    _user: mastodon.v1.Account
): Promise<AccountFeature> {
    const results = await mastodonFetchPages<mastodon.v1.Notification>({
        fetch: api.v1.notifications.list,
        label: 'notifications'
    });

    console.log(`Retrieved ${results.length} notifications for InteractionsFeature(): `, results);

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
