/*
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class FollowedTagsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.FOLLOWED_TAGS);
    }

    // Return a dict keyed by tag name (values should be all 1)
    async featureGetter(): Promise<StringNumberDict> {
        return (await MastoApi.instance.getUserData()).followedTags;
    }

    // Sets the followedTags property on the Toot object before returning the score
    // TODO: this is less than ideal as it mutates the Toot object. Consider refactoring.
    async _score(toot: Toot) {
        toot = toot.reblog || toot;
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.scoreData);
        return toot.followedTags.length;
    }
};
