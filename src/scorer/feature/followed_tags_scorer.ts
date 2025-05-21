/*
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../types';


export default class FollowedTagsScorer extends FeatureScorer {
    constructor() {
        super(ScoreName.FOLLOWED_TAGS);
    }

    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot: Toot) {
        return toot.realToot().followedTags?.length || 0;
    }
};
