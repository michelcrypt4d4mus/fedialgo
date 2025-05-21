import AccountScorer from '../acccount_scorer';
import { StringNumberDict } from '../../types';
export default class MostFavouritedAccountsScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
