import AccountScorer from "./acccount_scorer";
import Toot from '../../api/objects/toot';
import { type StringNumberDict } from '../../types';
/** Score how many times the current user has favourited the tooter in the past. */
export default class MostFavouritedAccountsScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    static buildFavouritedAccounts(favourites: Toot[]): StringNumberDict;
}
