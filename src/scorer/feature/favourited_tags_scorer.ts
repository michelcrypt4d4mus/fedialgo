/*
 * Score how many times the current user has favourited the toot's hashtags in the past.
 */
import FeatureScorer from '../feature_scorer';
import MastoApi from '../../api/api';
import Toot from '../../api/objects/toot';
import { countTags } from '../../api/objects/tag';
import { ScoreName, StringNumberDict } from '../../types';
import { sumArray } from '../../helpers/collection_helpers';


export default class FavouritedTagsScorer extends FeatureScorer {
    constructor() {
        super(ScoreName.FAVOURITED_TAGS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        return countTags(await MastoApi.instance.getFavouritedToots());
    };

    async _score(toot: Toot) {
        return sumArray(toot.realToot().tags.map(tag => this.scoreData[tag.name] || 0));
    }
};
