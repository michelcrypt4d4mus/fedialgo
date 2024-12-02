import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';
export default class NumRepliesScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
}
