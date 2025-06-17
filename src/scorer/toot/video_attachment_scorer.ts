import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { ScoreName } from '../../enums';


/** Score the number of video attachments in the toot. */
export default class VideoAttachmentScorer extends TootScorer {
    description = "Favour video attachments";

    constructor() {
        super(ScoreName.VIDEO_ATTACHMENTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.videoAttachments.length;
    }
};
