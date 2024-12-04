import FeatureScorer from '../feature_scorer';
export default class ChaosFeatureScorer extends FeatureScorer {
    constructor();
    _score(): Promise<number>;
}
