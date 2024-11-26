/*
 * Random number generator to mix up the feed.
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
            defaultWeight: 1,
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getFollowedTags(api),
            scoreName: Key.FOLLOWED_TAGS,
        });
    }

    async score(toot: Toot) {
        let containsFollowedTag = false;

        toot.tags.forEach((tootTag) => {
            if (tootTag.name in this.feature) {
                console.log(`Found followed tag ${tootTag.name} in toot:`, toot);
                containsFollowedTag = true;
            }
        });

        return containsFollowedTag ? 1 : 0;
    }
};
