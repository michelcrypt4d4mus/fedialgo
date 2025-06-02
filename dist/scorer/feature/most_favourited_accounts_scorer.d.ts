import AccountScorer from "./acccount_scorer";
import Toot from '../../api/objects/toot';
import { type StringNumberDict } from '../../types';
export default class MostFavouritedAccountsScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    static buildFavouritedAccounts(favourites: Toot[]): StringNumberDict;
    static getFavouritedAccounts(): Promise<StringNumberDict>;
}
