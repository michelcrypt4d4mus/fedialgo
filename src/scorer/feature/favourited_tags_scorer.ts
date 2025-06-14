/*
 * Score how many times the current user has favourited the toot's hashtags in the past.
 */
import FeatureScorer from '../feature_scorer';
import TagList from '../../api/tag_list';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';
import { sumArray } from '../../helpers/collection_helpers';
import { type StringNumberDict } from '../../types';


export default class FavouritedTagsScorer extends FeatureScorer {
    description = "Favour toots containing hashtags you favourite";

    constructor() {
        super(ScoreName.FAVOURITED_TAGS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        return (await TagList.fromFavourites()).nameToNumTootsDict();
    };

    async _score(toot: Toot) {
        return sumArray(toot.realToot.tags.map(tag => this.scoreData[tag.name] || 0));
    }
};
