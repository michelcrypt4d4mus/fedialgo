import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { type StringNumberDict } from '../../types';
/**
 * Score how many times the current user has favourited the {@linkcode Toot}'s hashtags in the past.
 * @class FavouritedTagsScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class FavouritedTagsScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
