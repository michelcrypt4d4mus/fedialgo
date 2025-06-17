/**
 * @module toot_scorers
 */
import TagList from '../../api/tag_list';
import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { ScoreName } from '../../enums';
import { sumArray } from '../../helpers/collection_helpers';
import { type StringNumberDict } from "../../types";


/**
 * Score toots containing hashtags the user posts about a lot.
 */
export default class HashtagParticipationScorer extends TootScorer {
    description = "Favour hastags you've tooted about";

    constructor() {
        super(ScoreName.PARTICIPATED_TAGS);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        return (await TagList.buildParticipatedTags()).nameToNumTootsDict();
    };

    // Use the square root of the number of toots with the hashtag to prevent runaway scores
    // for hashtags like #uspol
    async _score(toot: Toot): Promise<number> {
        return sumArray(toot.realToot.tags.map(t => Math.sqrt(this.scoreData[t.name] || 0)));
    }
};
