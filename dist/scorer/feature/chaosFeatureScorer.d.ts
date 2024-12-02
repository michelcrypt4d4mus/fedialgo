import FeatureScorer from '../FeatureScorer';
export default class ChaosFeatureScorer extends FeatureScorer {
    constructor();
    _score(): Promise<number>;
}
