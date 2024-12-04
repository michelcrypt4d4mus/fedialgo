/*
 * Compute which accounts this user retoots the most often lately.
 */
import { mastodon } from "masto";

import { getUserRecentToots } from "../api/api";


export default async function reblogsFeature(
    api: mastodon.rest.Client,
    user: mastodon.v1.Account,
    recentToots?: mastodon.v1.Status[]
): Promise<Record<string, number>> {
    recentToots ||= await getUserRecentToots(api, user);
    const recentRetoots = recentToots.filter(toot => toot?.reblog);
    console.log(`Recent toot history: `, recentToots);
    console.log(`Recent retoot history: `, recentRetoots);

    // Count retoots per user
    return recentRetoots.reduce(
        (counts: Record<string, number>, toot: mastodon.v1.Status) => {
            const retootOfAccount = toot?.reblog?.account?.acct;
            if (!retootOfAccount) return counts;

            counts[retootOfAccount] = (counts[retootOfAccount] || 0) + 1;
            return counts;
        },
        {}
    );
};
