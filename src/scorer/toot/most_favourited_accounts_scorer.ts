import Account from '../../api/objects/account';
import AccountScorer from "./acccount_scorer";
import MastoApi from '../../api/api';
import { ScoreName } from '../../enums';
import { type StringNumberDict } from '../../types';


/**
 * Score how many times the current user has favourited the tooter in the past.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class MostFavouritedAccountsScorer extends AccountScorer {
    description = "Favour accounts you often favourite";

    constructor() {
        super(ScoreName.FAVOURITED_ACCOUNTS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        const favouritedToots = await MastoApi.instance.getFavouritedToots();
        return Account.countAccounts(favouritedToots.map(toot => toot.account));
    };
};
