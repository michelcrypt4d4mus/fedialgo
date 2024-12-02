import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';
export default class RepliedFeatureScorer extends FeatureScorer {
    constructor();
    score(toot: Toot): Promise<number>;
}
