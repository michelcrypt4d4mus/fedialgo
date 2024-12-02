/*
 * Score how many times the user has replied to the author of the toot.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../FeatureScorer';
import MastodonApiCache from '../../features/mastodon_api_cache';
import { Key } from '../../Storage';
import { Toot } from '../../types';


export default class RepliedFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots from accounts you often reply to",
            defaultWeight: 1,
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getMostRepliedAccounts(api),
            scoreName: Key.REPLIED_TO,
        });
    }

    async score(toot: Toot) {
        return this.feature[toot.account.id] || 0;
    }
};
