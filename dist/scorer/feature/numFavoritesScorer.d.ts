import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';
export default class NumFavoritesScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
}
