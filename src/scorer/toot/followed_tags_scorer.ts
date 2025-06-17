/**
 * @module toot_scorers
 */
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { ScoreName } from '../../enums';


/**
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
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
