/*
 * Score how many times the toot has been favorited by other users.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class VideoAttachmentScorer extends FeatureScorer {
    constructor() {
        super(WeightName.VIDEO_ATTACHMENTS);
    }

    async _score(toot: Toot) {
        return toot.videoAttachments().length;
    }
};
