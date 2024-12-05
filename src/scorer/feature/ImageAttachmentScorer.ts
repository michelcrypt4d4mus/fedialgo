/*
 * Score how many times the toot has been favorited by other users.
 */
import FeatureScorer from '../feature_scorer';
import { imageAttachments } from '../../objects/toot';
import { Toot } from '../../types';
import { WeightName } from "../../types";


// TODO: unclear whether favorites are pulled from servers other than the users' home server
export default class ImageAttachmentScorer extends FeatureScorer {
    constructor() {
        super({scoreName: WeightName.IMAGE_ATTACHMENTS});
    }

    async _score(toot: Toot) {
        return imageAttachments(toot).length;
    }
};
