/*
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';
import { mastodon } from 'masto';


export default class FollowedTagsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: () => FollowedTagsFeatureScorer.fetchRequiredData(),
            scoreName: WeightName.FOLLOWED_TAGS,
        });
    }

    async _score(toot: Toot) {
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.feature);
        return toot.followedTags.length;
    }

    static async fetchRequiredData(): Promise<StringNumberDict> {
        const tags = await MastoApi.instance.getFollowedTags();
        return countValues<mastodon.v1.Tag>(tags, (tag) => tag.name?.toLowerCase());
    }
};
