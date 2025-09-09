import TagList from '../../api/tag_list';
import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';
import { sumArray } from '../../helpers/collection_helpers';
import { type StringNumberDict } from "../../types";


/**
 * Score {@linkcode Toot}s containing hashtags the user posts about a lot.
 * @memberof module:toot_scorers
 * @augments Scorer
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
