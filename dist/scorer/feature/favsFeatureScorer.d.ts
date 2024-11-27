import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';
export default class FavsFeatureScorer extends FeatureScorer {
    constructor();
    score(toot: Toot): Promise<number>;
}
