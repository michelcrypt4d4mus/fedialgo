import AccountScorer from "./acccount_scorer";
import { type StringNumberDict } from '../../types';
/**
 * Score how many times the current user has favourited the tooter in the past.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class MostFavouritedAccountsScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
