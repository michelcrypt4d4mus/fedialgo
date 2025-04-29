import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { StringNumberDict, TrendingLink } from "../../types";
export default class TrendingLinksScorer extends FeatureScorer {
    trendingLinks: TrendingLink[];
    constructor();
    featureGetter(): Promise<StringNumberDict>;
    populateTrendingLinks(toot: Toot): void;
    _score(toot: Toot): Promise<number>;
}
