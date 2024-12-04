import FeatureScorer from '../FeatureScorer';
import { Toot } from "../../types";
export declare const TRENDING_TAGS = "TrendingTags";
export declare const TRENDING_TAGS_DEFAULT_WEIGHT = 0.4;
export default class TrendingTagsFeatureScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
    private scoreTag;
}
