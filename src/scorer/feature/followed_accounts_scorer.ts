/*
 * One point for each of the original poster and retooter that the user follows.
 */
import Account from '../../api/objects/account';
import FeatureScorer from '../feature_scorer';
import MastoApi from '../../api/api';
import Toot from '../../api/objects/toot';
import { ScoreName, StringNumberDict } from '../../types';


export default class FollowedAccountsScorer extends FeatureScorer {
    description = "Favour accounts you follow";

    constructor() {
        super(ScoreName.FOLLOWED_ACCOUNTS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        return Account.countAccounts(await MastoApi.instance.getFollowedAccounts());
    };

    async _score(toot: Toot): Promise<number> {
        let _score = this.scoreData[toot.account.webfingerURI]
        return _score + (toot.reblog ? this.scoreData[toot.reblog?.account.webfingerURI] : 0);
    }
};
