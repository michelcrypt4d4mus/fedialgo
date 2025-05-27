/*
 * Score how many times the current user has favourited the toot's hashtags in the past.
 */
import FeatureScorer from '../feature_scorer';
import MastoApi from '../../api/api';
import TagList from '../../api/objects/tag_list';
import Toot from '../../api/objects/toot';
import { ScoreName, StringNumberDict } from '../../types';
import { sumArray } from '../../helpers/collection_helpers';


export default class FavouritedTagsScorer extends FeatureScorer {
    description = "Favour toots containing hashtags you favourite";

    constructor() {
        super(ScoreName.FAVOURITED_TAGS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        const rankedTags = await TagList.fromFavourites();
        return rankedTags.numTootsLookupDict();
    };

    async _score(toot: Toot) {
        return sumArray(toot.realToot().tags.map(tag => this.scoreData[tag.name] || 0));
    }
};
