import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { type StringNumberDict } from '../../types';
/**
 * Score how many accounts that the user follows are mentioned in the toot.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class MentionsFollowedScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
