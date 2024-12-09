import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
export default class ImageAttachmentScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
}
