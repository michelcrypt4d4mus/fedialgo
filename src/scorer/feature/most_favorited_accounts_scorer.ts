/*
 * Score how many times the current user has favorited the tooter in the past.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers';
import { StringNumberDict, WeightName } from '../../types';
import { MastoApi } from '../../api/api';


export default class MostFavoritedAccountsScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: () => MostFavoritedAccountsScorer.fetchRequiredData(),
            scoreName: WeightName.FAVORITED_ACCOUNTS
        });
    }

    async _score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }

    static async fetchRequiredData(): Promise<StringNumberDict> {
        const recentFavourites = await MastoApi.instance.fetchRecentFavourites();
        const faves = countValues<mastodon.v1.Status>(recentFavourites, (toot) => toot.account?.acct);
        console.log(`Retrieved MostFavoritedAccountsScorer: `, faves);
        return faves;
    };

};
