/*
 * Score how many times the current user has favorited the tooter in the past.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../FeatureScorer';
import FeatureStore from '../../features/FeatureStore';
import { Toot } from '../../types';


export default class favsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots from users whose toots you have favorited",
            defaultWeight: 1,
            featureGetter: (api: mastodon.rest.Client) => FeatureStore.getMostFavoritedAccounts(api),
            scoreName: "Favs",
        })
    }

    async score(toot: Toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
};
