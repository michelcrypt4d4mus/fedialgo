/*
 * Score how many times the current user has favourited the tooter in the past.
 */
import Account from '../../api/objects/account';
import AccountScorer from '../acccount_scorer';
import MastoApi from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class MostFavoritedAccountsScorer extends AccountScorer {
    constructor() {
        super(WeightName.FAVOURITED_ACCOUNTS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        const recentFavourites = await MastoApi.instance.getRecentFavourites();
        return Account.buildWebfingerUriLookup(recentFavourites.map(toot => toot.account));
    };
};
