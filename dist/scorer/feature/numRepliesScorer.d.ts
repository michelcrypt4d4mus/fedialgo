import FeatureScorer from '../FeatureScorer';
import { mastodon } from 'masto';
import { Toot } from '../../types';
export default class numRepliesScorer extends FeatureScorer {
    constructor();
    score(_api: mastodon.rest.Client, toot: Toot): Promise<number>;
}
