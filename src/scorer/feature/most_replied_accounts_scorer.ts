/*
 * Score how many times the user has replied to the author of the toot.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import MastodonApiCache from '../../api/mastodon_api_cache';
import { Toot } from '../../types';
import { WeightName } from "../../types";


export default class MostRepliedAccountsScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostRepliedAccounts(api),
            scoreName: WeightName.MOST_REPLIED_ACCOUNTS,
        });
    }

    async _score(toot: Toot) {
        return this.feature[toot.account.id] || 0;
    }
};
