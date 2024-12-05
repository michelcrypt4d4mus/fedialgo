/*
 * Score how many times the toot has been favorited by other users.
 */
import FeatureScorer from '../feature_scorer';
import { Toot } from '../../types';
import { videoAttachments } from '../../objects/toot';
import { WeightName } from '../../config';


// TODO: unclear whether favorites are pulled from servers other than the users' home server
export default class VideoAttachmentScorer extends FeatureScorer {
    constructor() {
        super({scoreName: WeightName.VIDEO_ATTACHMENTS});
    }

    async _score(toot: Toot) {
        return videoAttachments(toot).length;
    }
};
