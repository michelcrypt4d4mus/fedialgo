/*
 * Score how many times the current user has favorited the tooter in the past.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import MastodonApiCache from '../../api/mastodon_api_cache';
import { mastodonFetchPages } from '../../api/api';
import { AccountFeature, Toot, WeightName } from '../../types';


export default class MostFavoritedAccountsScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostFavoritedAccounts(api),
            scoreName: WeightName.FAVORITED_ACCOUNTS
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }

    static async fetchRequiredData(
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

};
