/*
 * Score how many times the current user has favourited the tooter in the past.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers/collection_helpers';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class MostFavoritedAccountsScorer extends FeatureScorer {
    constructor() {
        super(WeightName.FAVOURITED_ACCOUNTS);
        this.scoresRetoots = true;
    };

    async featureGetter(): Promise<StringNumberDict> {
        const recentFavourites = await MastoApi.instance.fetchRecentFavourites();
        return countValues<Toot>(recentFavourites, (toot) => toot.account?.webfingerURI());
    };

    async _score(toot: Toot) {
        const score = this.requiredData[toot.account.webfingerURI()] || 0;
        return score + (toot.reblog ? (this.requiredData[toot.reblog.account.webfingerURI()] || 0) : 0);
    };
};
