import FeatureScorer from '../FeatureScorer';
export default class ChaosFeatureScorer extends FeatureScorer {
    constructor();
    score(): Promise<number>;
}
