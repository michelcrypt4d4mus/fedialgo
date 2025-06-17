import TootScorer from '../toot_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


/**
 * Score the number of image attachments in the toot.
 * @memberof toot_scorers
 */
export default class ImageAttachmentScorer extends TootScorer {
    description = "Favour toots with images";

    constructor() {
        super(ScoreName.IMAGE_ATTACHMENTS);
    }

    async _score(toot: Toot) {
        return toot.realToot.imageAttachments.length;
    }
};
