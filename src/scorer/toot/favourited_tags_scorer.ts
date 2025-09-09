import TagList from '../../api/tag_list';
import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';
import { sumArray } from '../../helpers/collection_helpers';
import { type StringNumberDict } from '../../types';


/**
 * Score how many times the current user has favourited the {@linkcode Toot}'s hashtags in the past.
 * @class FavouritedTagsScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class FavouritedTagsScorer extends TootScorer {
    description = "Favour toots containing hashtags you favourite";

    constructor() {
        super(ScoreName.FAVOURITED_TAGS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        return (await TagList.buildFavouritedTags()).nameToNumTootsDict();
    };

    async _score(toot: Toot) {
        return sumArray(toot.realToot.tags.map(tag => this.scoreData[tag.name] || 0));
    }
};
