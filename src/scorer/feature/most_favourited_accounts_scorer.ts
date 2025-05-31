/*
 * Score how many times the current user has favourited the tooter in the past.
 */
import Account from '../../api/objects/account';
import AccountScorer from "./acccount_scorer";
import MastoApi from '../../api/api';
import { ScoreName } from '../../enums';
import { type StringNumberDict } from '../../types';


export default class MostFavouritedAccountsScorer extends AccountScorer {
    description = "Favour accounts you often favourite";

    constructor() {
        super(ScoreName.FAVOURITED_ACCOUNTS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        const recentFavourites = await MastoApi.instance.getFavouritedToots();
        return Account.countAccounts(recentFavourites.map(toot => toot.account));
    };
};
