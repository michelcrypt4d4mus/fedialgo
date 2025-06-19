import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
/**
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class FollowedTagsScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
