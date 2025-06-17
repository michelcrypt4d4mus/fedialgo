import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { type StringNumberDict } from '../../types';
/**
 * One point if you follow the account (retoots by followed accounts are picked up by the
 * RetootsInFeedScorer).
 */
export default class FollowedAccountsScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
