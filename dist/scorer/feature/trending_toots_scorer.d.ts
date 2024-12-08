import FeatureScorer from '../feature_scorer';
import { Toot } from "../../types";
export default class TrendingTootScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
}
