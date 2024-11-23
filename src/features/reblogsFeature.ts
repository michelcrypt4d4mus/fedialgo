/*
 * Compute which accounts this user retoots the most often lately.
 */
import { mastodon } from "masto";

import { mastodonFetchPages } from "../helpers";

const MAX_PAGES_OF_USER_TOOTS = 3;
const MAX_TOOTS_TO_SCAN = 100;


export default async function reblogsFeature(
    api: mastodon.rest.Client,
    user: mastodon.v1.Account
): Promise<Record<string, number>> {
    const recentToots = await mastodonFetchPages<mastodon.v1.Status>(
        api.v1.accounts.$select(user.id).statuses.list,
        MAX_PAGES_OF_USER_TOOTS,
        MAX_TOOTS_TO_SCAN
    );

    const recentRetoots = recentToots.filter(toot => toot?.reblog);
    console.log(`Recent toot history: `, recentToots);
    console.log(`Recent retoot history: `, recentRetoots);

    // Count retoots per user
    const retootedUserCounts = recentRetoots.reduce(
        (counts: Record<string, number>, toot: mastodon.v1.Status) => {
            if (!toot?.reblog?.account?.acct) return counts;

            counts[toot.reblog.account.acct] = (counts[toot.reblog.account.acct] || 0) + 1;
            return counts;
        },
        {}
    );

    console.log(`Most retooted users retootedUserCounts: `, retootedUserCounts);
    return retootedUserCounts;
};
