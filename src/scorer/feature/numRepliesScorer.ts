/*
 * Score how many times the toot has been replied to by other users.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../FeatureScorer';
import FeatureStorage from '../../features/FeatureStore';
import { Toot } from '../../types';


export default class numRepliesScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => FeatureStorage.getTopFavs(api),
            scoreName: "numReplies",
            description: "Favor posts that have been replied to many times",
            defaultWeight: 1,
        })
    }

    async score(_api: mastodon.rest.Client, toot: Toot) {
        return toot?.repliesCount || 0;
    }
};
