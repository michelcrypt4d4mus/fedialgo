import AccountScorer from './acccount_scorer';
import { type StringNumberDict } from '../../types';
export default class FollowersScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
