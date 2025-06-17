/**
 * @module scorers
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/** Score the number of video attachments in the toot. */
export default class VideoAttachmentScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
