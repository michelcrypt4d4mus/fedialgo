import { mastodon } from 'masto';
import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';
export default class favsFeatureScorer extends FeatureScorer {
    constructor();
    score(_api: mastodon.rest.Client, toot: Toot): Promise<number>;
}
