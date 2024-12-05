import FeatureScorer from '../feature_scorer';
import { Toot } from "../../types";
export declare const TRENDING_TOOTS_DEFAULT_WEIGHT = 0.08;
export default class TrendingTootFeatureScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
}
