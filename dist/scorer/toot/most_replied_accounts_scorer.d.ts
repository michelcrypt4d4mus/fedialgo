import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { type StringNumberDict } from '../../types';
/**
 * Score how many times the user has replied to the creator of the {@linkcode Toot}.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class MostRepliedAccountsScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
