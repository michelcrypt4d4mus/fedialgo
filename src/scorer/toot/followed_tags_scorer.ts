import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';


/**
 * Populate the {@linkcode Toot.followedTags} property on {@linkcode Toot} object and return
 * the number of tags on the {@linkcode Toot} that the user is following.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class FollowedTagsScorer extends TootScorer {
    description = "Favour toots containing hashtags you follow";

    constructor() {
        super(ScoreName.FOLLOWED_TAGS);
    }

    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot: Toot) {
        return toot.realToot.followedTags?.length || 0;
    }
};
