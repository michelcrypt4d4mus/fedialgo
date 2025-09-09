import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


/**
 * Score the number of image attachments in the {@linkcode Toot}.
 * @memberof module:toot_scorers
 * @augments Scorer
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
