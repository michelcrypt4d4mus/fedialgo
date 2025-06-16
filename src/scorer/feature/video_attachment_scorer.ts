/*
 * Score the number of video attachments in the toot.
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../feature_scorer';
import { ScoreName } from '../../enums';


export default class VideoAttachmentScorer extends TootScorer {
    description = "Favour video attachments";

    constructor() {
        super(ScoreName.VIDEO_ATTACHMENTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.videoAttachments.length;
    }
};
