/*
 * Compute which accounts this user replies to a lot.
 */
import { mastodon } from "masto";

import { getUserRecentToots } from "./reblogsFeature";


export default async function repliedFeature(
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
