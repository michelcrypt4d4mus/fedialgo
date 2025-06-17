import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
/**
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 * @memberof toot_scorers
 */
export default class FollowedTagsScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
