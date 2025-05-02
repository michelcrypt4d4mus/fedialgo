/*
 * Score toots containing hashtags the user posts about a lot
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import UserData from '../../api/user_data';
import { StringNumberDict, WeightName } from "../../types";
import { sumArray } from '../../helpers/collection_helpers';


export default class HashtagParticipationScorer extends FeatureScorer {
    constructor() {
        super(WeightName.HASHTAG_PARTICIPATION);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        const userTags = await UserData.getUsersHashtags();

        return Object.values(userTags).reduce(
            (acc, tag) => {
                acc[tag.name] = tag.numToots || 0;
                return acc;
            },
            {} as StringNumberDict
        );
    };

    async _score(toot: Toot): Promise<number> {
        return sumArray(toot.realToot().tags.map(t => this.scoreData[t.name] || 0));
    }
};
