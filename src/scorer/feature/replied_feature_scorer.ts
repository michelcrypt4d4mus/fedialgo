/*
 * Score how many times the user has replied to the author of the toot.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import MastodonApiCache from '../../api/mastodon_api_cache';
import { Key } from '../../Storage';
import { Toot } from '../../types';


export default class RepliedFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour accounts you often reply to",
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostRepliedAccounts(api),
            scoreName: Key.REPLIED_TO,
        });
    }

    async _score(toot: Toot) {
        return this.feature[toot.account.id] || 0;
    }
};
