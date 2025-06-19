import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * @private
 */
export default abstract class AccountScorer extends TootScorer {
    _score(toot: Toot): Promise<number>;
}
