import AccountScorer from './acccount_scorer';
import { type StringNumberDict } from '../../types';
/**
 * One point for accounts that follow the Fedialgo user.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class FollowersScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
