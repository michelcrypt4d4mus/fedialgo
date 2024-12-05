/*
 * Score how many times the current user has favorited the tooter in the past.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import MastodonApiCache from '../../api/mastodon_api_cache';
import { Toot } from '../../types';
import { WeightName } from '../../config';


export default class FavsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostFavoritedAccounts(api),
            scoreName: WeightName.FAVORITED_ACCOUNTS
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
};
