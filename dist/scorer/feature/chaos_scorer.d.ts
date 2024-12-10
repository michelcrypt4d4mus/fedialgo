import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
export default class ChaosScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
    decimalHash(s: string): number;
}
