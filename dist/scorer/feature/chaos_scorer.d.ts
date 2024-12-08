import FeatureScorer from '../feature_scorer';
export default class ChaosScorer extends FeatureScorer {
    constructor();
    _score(): Promise<number>;
}
