/*
 * Score the number of image attachments in the toot.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from "../../types";


export default class ImageAttachmentScorer extends FeatureScorer {
    constructor() {
        super(ScoreName.IMAGE_ATTACHMENTS);
    }

    async _score(toot: Toot) {
        return toot.realToot().imageAttachments.length;
    }
};
