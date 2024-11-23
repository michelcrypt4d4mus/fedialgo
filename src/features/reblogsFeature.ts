/*
 * Compute which accounts this user retoots the most often lately.
 */
import { mastodon } from "masto";

const MAX_PAGES_OF_USER_TOOTS = 3;
const MAX_TOOTS_TO_SCAN = 100;


export default async function getReblogsFeature(api: mastodon.rest.Client, user: mastodon.v1.Account): Promise<Record<string, number>> {
    let recentToots: mastodon.v1.Status[] = [];
    let pageNumber = 0;

    try {
        for await (const page of api.v1.accounts.$select(user.id).statuses.list({ limit: MAX_TOOTS_TO_SCAN })) {
            recentToots = recentToots.concat(page);
            pageNumber++;
            console.log(`Retrieved page ${pageNumber} of current user's toots...`);

            if (pageNumber == MAX_PAGES_OF_USER_TOOTS || recentToots.length >= MAX_TOOTS_TO_SCAN) {
                console.log(`Halting old toot retrieval at page ${pageNumber} with ${recentToots.length} toots)...`);
                break;
            }
        }
    } catch (e) {
        console.error(e);
        return {};
    }

    const recentRetoots = recentToots.filter(toot => toot?.reblog);
    console.log(`Recent toot history: `, recentToots);
    console.log(`Recent retoot history: `, recentRetoots);

    // Count retoots per user
    const retootedUserCounts = recentRetoots.reduce(
        (counts: Record<string, number>, toot: mastodon.v1.Status) => {
            if (!toot?.reblog?.account?.acct) return counts;

            if (toot.reblog.account.acct in counts) {
                counts[toot.reblog.account.acct] += 1;
            } else {
                counts[toot.reblog.account.acct] = 1;
            }

            return counts;
        },
        {}
    );

    console.log(`Most retooted users retootedUserCounts: `, retootedUserCounts);
    return retootedUserCounts;
}
