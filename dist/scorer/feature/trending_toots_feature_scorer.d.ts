import FeatureScorer from '../feature_scorer';
import { Toot } from "../../types";
export default class TrendingTootFeatureScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
}
