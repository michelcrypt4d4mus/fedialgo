/*
 * One point if you follow the account (retoots by followed accounts are picked up by the
 * RetootsInFeedScorer).
 */
import Account from '../../api/objects/account';
import FeatureScorer from '../feature_scorer';
import MastoApi from '../../api/api';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';
import { type StringNumberDict } from '../../types';


export default class FollowedAccountsScorer extends FeatureScorer {
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
