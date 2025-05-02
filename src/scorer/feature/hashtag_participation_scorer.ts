/*
 * Score toots containing hashtags the user posts about a lot
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { participatedHashtags } from '../../api/objects/tag';
import { StringNumberDict, WeightName } from "../../types";
import { sumArray } from '../../helpers/collection_helpers';


export default class HashtagParticipationScorer extends FeatureScorer {
    constructor() {
        super(WeightName.HASHTAG_PARTICIPATION);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        return await participatedHashtags();;
    };

    async _score(toot: Toot): Promise<number> {
        return sumArray(toot.realToot().tags.map(t => this.scoreData[t.name] || 0));
    }
};
