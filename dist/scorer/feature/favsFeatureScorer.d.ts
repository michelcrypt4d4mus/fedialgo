import FeatureScorer from '../FeatureScorer';
import { mastodon } from 'masto';
import { StatusType } from '../../types';
export default class favsFeatureScorer extends FeatureScorer {
    constructor();
    score(_api: mastodon.rest.Client, status: StatusType): Promise<number>;
}
