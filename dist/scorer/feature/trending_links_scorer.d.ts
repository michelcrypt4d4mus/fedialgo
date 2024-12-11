import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { StringNumberDict, TrendingLinkUrls } from "../../types";
export default class TrendingLinksScorer extends FeatureScorer {
    linkData: TrendingLinkUrls;
    constructor();
    featureGetter(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
