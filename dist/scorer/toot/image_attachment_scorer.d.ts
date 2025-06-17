import TootScorer from '../toot_scorer';
import Toot from '../../api/objects/toot';
/**
 * Score the number of image attachments in the toot.
 */
export default class ImageAttachmentScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
