/*
 * Score how many times the user has replied to the creator of the toot.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers/collection_helpers';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class MostRepliedAccountsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.MOST_REPLIED_ACCOUNTS);
    }

    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    async prepareScoreData(): Promise<StringNumberDict> {
        const recentToots = await MastoApi.instance.getUserRecentToots();
        const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
        return countValues<Toot>(recentReplies, (toot) => toot?.inReplyToAccountId);
    };

    async _score(toot: Toot) {
        const score = this.scoreData[toot.account.id] || 0;
        return score + (toot.reblog ? (this.scoreData[toot.reblog.account.id] || 0) : 0);
    };
};
