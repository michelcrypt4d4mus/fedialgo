/*
 * Score how many times the current user has favorited the tooter in the past.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../FeatureScorer';
import MastodonApiCache from '../../features/mastodon_api_cache';
import { Key } from '../../Storage';
import { Toot } from '../../types';


export default class FavsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour accounts you often favourite",
            defaultWeight: 1,
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostFavoritedAccounts(api),
            scoreName: Key.TOP_FAVS,
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
};
