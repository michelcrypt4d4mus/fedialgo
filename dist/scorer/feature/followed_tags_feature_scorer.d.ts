import FeatureScorer from '../FeatureScorer';
import { Toot } from '../../types';
export default class FollowedTagsFeatureScorer extends FeatureScorer {
    constructor();
    score(toot: Toot): Promise<0 | 1>;
}
