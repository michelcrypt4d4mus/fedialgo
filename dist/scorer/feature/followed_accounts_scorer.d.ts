import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { type StringNumberDict } from '../../types';
export default class FollowedAccountsScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
