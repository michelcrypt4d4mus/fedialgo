import TootScorer from '../toot_scorer';
import Toot from '../../api/objects/toot';
export default class ImageAttachmentScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
