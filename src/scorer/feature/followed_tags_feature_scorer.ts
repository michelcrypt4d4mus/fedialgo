/*
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../FeatureScorer';
import MastodonApiCache from '../../features/mastodon_api_cache';
import { Key } from '../../Storage';
import { Toot } from '../../types';


export default class FollowedTagsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favor toots that contain hashtags you are following",
            defaultWeight: 2,
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getFollowedTags(api),
            scoreName: Key.FOLLOWED_TAGS,
        });
    }

    async _score(toot: Toot) {
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.feature);
        return toot.followedTags.length;
    }
};
