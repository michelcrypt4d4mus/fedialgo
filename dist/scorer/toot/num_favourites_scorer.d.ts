/**
 * @module toot_scorers
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/**
 * Score how many times the toot has been favourited by other users.
 * Note: favorites don't propagate across servers, so this is only useful for the
 * user's home server.
 */
export default class NumFavouritesScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
