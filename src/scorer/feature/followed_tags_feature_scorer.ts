/*
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


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
        console.log(`Retrieved followed tags with FollowedTagsFeature():`, tags);

        // Return tags a a dict of the form {tagString: 1}
        return tags.reduce((acc, tag) => {
            acc[tag.name.toLowerCase()] = 1;
            return acc;
        }, {} as StringNumberDict);
    }
};
