/*
 * Score how many times the current user has favorited the tooter in the past.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { MastoApi } from '../../api/api';
import { AccountFeature, WeightName } from '../../types';


export default class MostFavoritedAccountsScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: () => MostFavoritedAccountsScorer.fetchRequiredData(),
            scoreName: WeightName.FAVORITED_ACCOUNTS
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }

    static async fetchRequiredData(): Promise<AccountFeature> {
        const recentFavourites = await MastoApi.instance.fetchRecentFavourites();
        console.log(`Retrieved faves with MostFavoritedAccounts() : `, recentFavourites);

        return recentFavourites.reduce(
            (favouriteCounts: AccountFeature, toot: mastodon.v1.Status,) => {
                if (!toot.account) return favouriteCounts;
                favouriteCounts[toot.account.acct] = (favouriteCounts[toot.account.acct] || 0) + 1;
                return favouriteCounts;
            },
            {}
        );
    };

};
