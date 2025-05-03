/*
 * Score how many times the current user has favourited the tooter in the past.
 */
import AccountScorer from '../acccount_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers/collection_helpers';
import MastoApi from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class MostFavoritedAccountsScorer extends AccountScorer {
    constructor() {
        super(WeightName.FAVOURITED_ACCOUNTS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        const recentFavourites = await MastoApi.instance.getRecentFavourites();
        return countValues<Toot>(recentFavourites, (toot) => toot.account?.webfingerURI);
    };
};
