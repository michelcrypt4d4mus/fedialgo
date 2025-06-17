import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { type StringNumberDict } from '../../types';
/**
 * One point if you follow the author (followed retoots are picked up by the RetootsInFeedScorer).
 * @memberof toot_scorers
 * @augments Scorer
 */
export default class FollowedAccountsScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
