/*
 * Score how many times the current user has favourited the tooter in the past.
 */
import Account from '../../api/objects/account';
import AccountScorer from "./acccount_scorer";
import MastoApi from '../../api/api';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';
import { type StringNumberDict } from '../../types';


export default class MostFavouritedAccountsScorer extends AccountScorer {
    description = "Favour accounts you often favourite";

    constructor() {
        super(ScoreName.FAVOURITED_ACCOUNTS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        return await MostFavouritedAccountsScorer.getFavouritedAccounts();
    };

    static buildFavouritedAccounts(favourites: Toot[]): StringNumberDict {
        return Account.countAccounts(favourites.map(toot => toot.account));
    }

    static async getFavouritedAccounts(): Promise<StringNumberDict> {
        return this.buildFavouritedAccounts(await MastoApi.instance.getFavouritedToots());
    }
};
