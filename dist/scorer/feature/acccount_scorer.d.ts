import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
export default abstract class AccountScorer extends TootScorer {
    _score(toot: Toot): Promise<number>;
}
