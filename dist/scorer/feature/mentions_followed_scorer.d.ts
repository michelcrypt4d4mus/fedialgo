import { mastodon } from 'masto';
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { StringNumberDict } from '../../types';
export default class MentionsFollowedScorer extends FeatureScorer {
    followedAccounts: mastodon.v1.Account[];
    constructor();
    featureGetter(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
