/*
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class FollowedTagsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.FOLLOWED_TAGS);
    }

    async featureGetter(): Promise<StringNumberDict> {
        const tags = await MastoApi.instance.getFollowedTags();
        return countValues<mastodon.v1.Tag>(tags, (tag) => tag.name?.toLowerCase());
    }

    async _score(toot: Toot) {
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.requiredData);
        return toot.followedTags.length;
    }
};
