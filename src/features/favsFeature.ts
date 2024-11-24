/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";
import { mastodonFetchPages } from "../helpers";


export default async function FavsFeature(api: mastodon.rest.Client): Promise<AccountFeature> {
    const results = await mastodonFetchPages<mastodon.v1.Status>(
        api.v1.favourites.list
    );

    console.log(`Retrieved faves with FavsFeature() AND mastodonFetchPages(): `, results);

    return results.reduce(
        (favoriteCounts: AccountFeature, toot: mastodon.v1.Status,) => {
            if (!toot.account) return favoriteCounts;
            favoriteCounts[toot.account.acct] = (favoriteCounts[toot.account.acct] || 0) + 1;
            return favoriteCounts;
        },
        {}
    );
};
