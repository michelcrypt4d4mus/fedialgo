/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";
import { mastodonFetchPages } from "../api/api";
import { WeightName } from "../types";


export default async function MostFavoritedAccounts(
    api: mastodon.rest.Client,
    _user: mastodon.v1.Account
): Promise<AccountFeature> {
    const results = await mastodonFetchPages<mastodon.v1.Status>({
        fetch: api.v1.favourites.list,
        label: WeightName.FAVORITED_ACCOUNTS
    });

    console.log(`Retrieved faves with MostFavoritedAccounts() AND mastodonFetchPages(): `, results);

    return results.reduce(
        (favouriteCounts: AccountFeature, toot: mastodon.v1.Status,) => {
            if (!toot.account) return favouriteCounts;
            favouriteCounts[toot.account.acct] = (favouriteCounts[toot.account.acct] || 0) + 1;
            return favouriteCounts;
        },
        {}
    );
};
