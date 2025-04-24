import Account from '../../api/objects/account';
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { StringNumberDict } from '../../types';
export default class MentionsFollowedScorer extends FeatureScorer {
    followedAccounts: Account[];
    constructor();
    featureGetter(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
