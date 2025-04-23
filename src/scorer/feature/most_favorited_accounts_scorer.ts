/*
 * Score how many times the current user has favourited the tooter in the past.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class MostFavoritedAccountsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.FAVOURITED_ACCOUNTS);
    };

    async featureGetter(): Promise<StringNumberDict> {
        const recentFavourites = await MastoApi.instance.fetchRecentFavourites();
        return countValues<mastodon.v1.Status>(recentFavourites, (toot) => toot.account?.acct);
    };

    async _score(toot: Toot) {
        return (toot.account.acct in this.requiredData) ? this.requiredData[toot.account.acct] : 0;
    };
};
