/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";
import { mastodonFetchPages } from "../helpers";

const NUM_PAGES = 3;
const MAX_RECORDS = 80;


export default async function favFeature(api: mastodon.rest.Client): Promise<AccountFeature> {
    const results = await mastodonFetchPages<mastodon.v1.Status>(
        api.v1.favourites.list,
        NUM_PAGES,
        MAX_RECORDS
    );

    console.log(`Retrieved faves with favFeature() AND mastodonFetchPages(): `, results);

    const favFrequ = results.reduce(
        (favoriteCounts: AccountFeature, toot: mastodon.v1.Status,) => {
            if (!toot.account) return favoriteCounts;
            favoriteCounts[toot.account.acct] = (favoriteCounts[toot.account.acct] || 0) + 1;
            return favoriteCounts;
        },
        {}
    );

    console.log(`favFeature favFrequ: `, favFrequ);
    return favFrequ;
};
