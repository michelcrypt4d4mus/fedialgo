import AccountScorer from '../acccount_scorer';
import { StringNumberDict } from '../../types';
export default class MostFavoritedAccountsScorer extends AccountScorer {
    constructor();
    featureGetter(): Promise<StringNumberDict>;
}
