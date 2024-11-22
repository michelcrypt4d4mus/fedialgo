/*
 * Compute which accounts this user retoots the most often lately.
 */
import { mastodon } from "masto";

const MAX_PAGES_OF_USER_TOOTS = 3;
const MAX_TOOTS_TO_SCAN = 100;


export default async function getReblogsFeature(api: mastodon.rest.Client, user: mastodon.v1.Account): Promise<Record<string, number>> {
    let results: mastodon.v1.Status[] = [];
    let pageNumber = 0;

    try {
        for await (const page of api.v1.accounts.$select(user.id).statuses.list({ limit: MAX_TOOTS_TO_SCAN })) {
            results = results.concat(page);
            pageNumber++;
            console.log(`Retrieved page ${pageNumber} of current user's toots...`);

            if (pageNumber == MAX_PAGES_OF_USER_TOOTS || results.length >= MAX_TOOTS_TO_SCAN) {
                console.log(`Halting old toot retrieval at page ${pageNumber} with ${results.length} toots)...`);
                break;
            }
        }
    } catch (e) {
        console.error(e);
        return {};
    }

    console.log(`Retoot history: `, results);

    const reblogFrequ = results.reduce((accumulator: Record<string, number>, status: mastodon.v1.Status) => {
        if (status.reblog) {
            if (status.reblog.account.acct in accumulator) {
                accumulator[status.reblog.account.acct] += 1;
            } else {
                accumulator[status.reblog.account.acct] = 1;
            }
        }
        return accumulator
    }, {});

    console.log(`Most retooted users reblogFrequ: `, reblogFrequ);
    return reblogFrequ;
}
