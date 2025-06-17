import MastoApi from '../../api/api';
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { countValues, sumArray } from '../../helpers/collection_helpers';
import { ScoreName } from '../../enums';
import { type StringNumberDict } from '../../types';


/**
 * Score how many times the user has replied to the creator of the toot.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class MostRepliedAccountsScorer extends TootScorer {
    description = "Favour accounts you often reply to";

    constructor() {
        super(ScoreName.MOST_REPLIED_ACCOUNTS);
    }

    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    async prepareScoreData(): Promise<StringNumberDict> {
        const recentToots = await MastoApi.instance.getRecentUserToots();
        const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
        return countValues<Toot>(recentReplies, (toot) => toot?.inReplyToAccountId);
    };

    async _score(toot: Toot) {
        return sumArray(toot.withRetoot.map(t => this.scoreData[t.account.id]));
    };
};
