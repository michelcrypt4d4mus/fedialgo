import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { StringNumberDict, TrendingLink } from "../../types";
export default class TrendingLinksScorer extends FeatureScorer {
    trendingLinks: TrendingLink[];
    constructor();
    featureGetter(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
