/*
 * Score the number of video attachments in the toot.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


export default class VideoAttachmentScorer extends FeatureScorer {
    description = "Favour video attachments";

    constructor() {
        super(ScoreName.VIDEO_ATTACHMENTS);
    }

    async _score(toot: Toot) {
        return toot.realToot().videoAttachments.length;
    }
};
