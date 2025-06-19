import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * Score the number of video attachments in the toot.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class VideoAttachmentScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
