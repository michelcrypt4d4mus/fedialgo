/*
 * Score how many times the toot has been favorited by other users.
 */
import FeatureScorer from '../FeatureScorer';
import { imageAttachments } from '../../helpers';
import { Toot } from '../../types';

const SCORE_NAME = "ImageAttachments";


// TODO: unclear whether favorites are pulled from servers other than the users' home server
export default class ImageAttachmentScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots with image attachments",
            defaultWeight: 0,
            scoreName: SCORE_NAME,
        });
    }

    async score(toot: Toot) {
        return imageAttachments(toot).length;
    }
};
