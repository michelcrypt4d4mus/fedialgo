import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
export default abstract class AccountScorer extends FeatureScorer {
    _score(toot: Toot): Promise<number>;
}
