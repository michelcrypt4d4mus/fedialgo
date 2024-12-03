import FeatureScorer from '../FeatureScorer';
import { Toot } from "../../types";
export declare const TRENDING_TOOTS = "TrendingToots";
export declare const TRENDING_TOOTS_DEFAULT_WEIGHT = 0.08;
export default class TopPostFeatureScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
}
