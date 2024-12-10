import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { StringNumberDict } from '../../types';
export default class MostRepliedAccountsScorer extends FeatureScorer {
    constructor();
    featureGetter(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
