/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";
import { mastodonFetchPages } from "../helpers";

const NUM_PAGES = 3;
const MAX_RECORDS = 80;


export default async function favFeature(api: mastodon.rest.Client): Promise<AccountFeature> {
    // let results: mastodon.v1.Status[] = [];
    let results = await mastodonFetchPages<mastodon.v1.Status>(
        api.v1.favourites.list,
        NUM_PAGES,
        MAX_RECORDS
    );

    console.log(`Retrieved faves with favFeaturE() AND mastodonFetchPages(): `, results);

    const favFrequ = results.reduce((accumulator: AccountFeature, toot: mastodon.v1.Status,) => {
        if (!toot.account) return accumulator;

        if (toot.account.acct in accumulator) {
            accumulator[toot.account.acct] += 1;
        } else {
            accumulator[toot.account.acct] = 1;
        }

        return accumulator;
    }, {})

    console.log(`favFeature favFrequ: `, favFrequ);
    return favFrequ;
};
