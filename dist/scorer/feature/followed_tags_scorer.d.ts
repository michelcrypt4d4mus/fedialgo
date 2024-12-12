import { mastodon } from 'masto';
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { StringNumberDict } from '../../types';
export default class FollowedTagsScorer extends FeatureScorer {
    followedTags: mastodon.v1.Tag[];
    constructor();
    featureGetter(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
