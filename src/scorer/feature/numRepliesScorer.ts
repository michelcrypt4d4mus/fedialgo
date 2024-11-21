/*
 * Score how many times the toot has been replied to by other users.
 */
import FeatureScorer from '../FeatureScorer';
import FeatureStorage from '../../features/FeatureStore';
import { mastodon } from 'masto';
import { StatusType } from '../../types';


export default class numRepliesScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => FeatureStorage.getTopFavs(api),
            verboseName: "numReplies",
            description: "Favor posts that have been replied to many times",
            defaultWeight: 1,
        })
    }

    async score(_api: mastodon.rest.Client, status: StatusType) {
        return status?.repliesCount || 0;
    }
};
