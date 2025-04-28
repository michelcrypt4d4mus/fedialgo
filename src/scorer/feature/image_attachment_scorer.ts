/*
 * Score the number of image attachments in the toot.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class ImageAttachmentScorer extends FeatureScorer {
    constructor() {
        super(WeightName.IMAGE_ATTACHMENTS);
    }

    async _score(toot: Toot) {
        return (toot.reblog || toot).imageAttachments.length;
    }
};
