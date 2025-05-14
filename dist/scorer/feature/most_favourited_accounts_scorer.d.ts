import AccountScorer from '../acccount_scorer';
import { StringNumberDict } from '../../types';
export default class MostFavouritedAccountsScorer extends AccountScorer {
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
