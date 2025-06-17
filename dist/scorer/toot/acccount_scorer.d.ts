import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/**
 * @private
 */
export default abstract class AccountScorer extends TootScorer {
    _score(toot: Toot): Promise<number>;
}
