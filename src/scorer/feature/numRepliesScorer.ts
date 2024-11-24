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
            description: "Favor toots that have been replied to many times",
            defaultWeight: 1,
            scoreName: "numReplies",
        })
    }

    async score(toot: Toot) {
        return toot?.repliesCount || 0;
    }
};
