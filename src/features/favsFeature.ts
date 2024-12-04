/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";
import { mastodonFetchPages } from "../api/api";


export default async function FavsFeature(
    api: mastodon.rest.Client,
    _user: mastodon.v1.Account
): Promise<AccountFeature> {
    const results = await mastodonFetchPages<mastodon.v1.Status>({
        fetchMethod: api.v1.favourites.list,
        label: 'favourites'
    });

    console.log(`Retrieved faves with FavsFeature() AND mastodonFetchPages(): `, results);

    return results.reduce(
        (favouriteCounts: AccountFeature, toot: mastodon.v1.Status,) => {
            if (!toot.account) return favouriteCounts;
            favouriteCounts[toot.account.acct] = (favouriteCounts[toot.account.acct] || 0) + 1;
            return favouriteCounts;
        },
        {}
    );
};
