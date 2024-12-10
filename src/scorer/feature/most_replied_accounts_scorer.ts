/*
 * Score how many times the user has replied to the author of the toot.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class MostRepliedAccountsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.MOST_REPLIED_ACCOUNTS);
    }

    async _score(toot: Toot) {
        return this.requiredData[toot.account.id] || 0;
    }

    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    async featureGetter(): Promise<StringNumberDict> {
        const recentToots = await MastoApi.instance.getUserRecentToots();
        const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
        return countValues<mastodon.v1.Status>(recentReplies, (toot) => toot?.inReplyToAccountId);
    };
};
