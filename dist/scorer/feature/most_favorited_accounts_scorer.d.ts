import { mastodon } from 'masto';
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { AccountFeature } from '../../types';
export default class MostFavoritedAccountsScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
    static fetchRequiredData(api: mastodon.rest.Client, _user: mastodon.v1.Account): Promise<AccountFeature>;
}
