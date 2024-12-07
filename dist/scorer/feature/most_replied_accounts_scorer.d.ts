import { mastodon } from 'masto';
import FeatureScorer from '../feature_scorer';
import { Toot } from '../../types';
export default class MostRepliedAccountsScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
    static fetchRequiredData(api: mastodon.rest.Client, user: mastodon.v1.Account, recentToots?: mastodon.v1.Status[]): Promise<Record<string, number>>;
}
