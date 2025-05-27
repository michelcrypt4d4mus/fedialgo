/*
 * Score toots containing hashtags the user posts about a lot
 */
import FeatureScorer from '../feature_scorer';
import TagList from '../../api/tag_list';
import Toot from '../../api/objects/toot';
import UserData from '../../api/user_data';
import { ScoreName, StringNumberDict } from "../../types";
import { sumArray } from '../../helpers/collection_helpers';


export default class HashtagParticipationScorer extends FeatureScorer {
    description = "Favour hastags you've tooted about";

    constructor() {
        super(ScoreName.PARTICIPATED_TAGS);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        return (await TagList.fromParticipated()).numTootsLookupDict();
    };

    // Use the square root of the number of toots with the hashtag to prevent runaway scores
    // for hashtags like #uspol
    async _score(toot: Toot): Promise<number> {
        return sumArray(toot.realToot().tags.map(t => Math.sqrt(this.scoreData[t.name] || 0)));
    }
};
