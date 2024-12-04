import FeatureScorer from '../feature_scorer';
import { Toot } from '../../types';
export default class VideoAttachmentScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
}
