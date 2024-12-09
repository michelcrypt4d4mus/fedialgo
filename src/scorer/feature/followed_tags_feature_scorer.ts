/*
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import MastodonApiCache from '../../api/mastodon_api_cache';
import Toot from '../../api/objects/toot';
import { mastodonFetchPages } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class FollowedTagsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => MastodonApiCache.getFollowedTags(api),
            scoreName: WeightName.FOLLOWED_TAGS,
        });
    }

    async _score(toot: Toot) {
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.feature);
        return toot.followedTags.length;
    }

    static async fetchRequiredData(
        api: mastodon.rest.Client,
        _user: mastodon.v1.Account
    ): Promise<StringNumberDict> {
        const tags = await mastodonFetchPages<mastodon.v1.Tag>({
            fetch: api.v1.followedTags.list,
            label: WeightName.FOLLOWED_TAGS
        });

        console.log(`Retrieved followed tags with FollowedTagsFeature():`, tags);

        // Return tags a a dict of the form {tagString: 1}
        return tags.reduce((acc, tag) => {
            acc[tag.name.toLowerCase()] = 1;
            return acc;
        }, {} as StringNumberDict);
    }
};
