import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


/**
 * Score the number of video attachments in the toot.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class VideoAttachmentScorer extends TootScorer {
    description = "Favour video attachments";

    constructor() {
        super(ScoreName.VIDEO_ATTACHMENTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.videoAttachments.length;
    }
};
