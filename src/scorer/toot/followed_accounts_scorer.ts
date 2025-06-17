/**
 * @module toot_scorers
 */
import Account from '../../api/objects/account';
import MastoApi from '../../api/api';
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { ScoreName } from '../../enums';
import { type StringNumberDict } from '../../types';


/** One point if you follow the author (followed retoots are picked up by the RetootsInFeedScorer). */
export default class FollowedAccountsScorer extends TootScorer {
    description = "Favour accounts you follow";

    constructor() {
        super(ScoreName.FOLLOWED_ACCOUNTS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        return Account.countAccounts(await MastoApi.instance.getFollowedAccounts());
    };

    async _score(toot: Toot): Promise<number> {
        return this.scoreData[toot.account.webfingerURI] ?? 0;
    }
};
