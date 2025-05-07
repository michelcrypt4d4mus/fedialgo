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
        super(WeightName.PARTICIPATED_TAGS);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        const userTags = await UserData.getUserParticipatedTags();

        return Object.values(userTags).reduce(
            (acc, tag) => {
                acc[tag.name] = tag.numToots || 0;
                return acc;
            },
            {} as StringNumberDict
        );
    };

    // Use the square root of the number of toots with the hashtag to prevent runaway scores
    // for hashtags like #uspol
    async _score(toot: Toot): Promise<number> {
        return sumArray(toot.realToot().tags.map(t => Math.sqrt(this.scoreData[t.name] || 0)));
    }
};
