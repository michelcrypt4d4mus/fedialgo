/*
 * Score how many times the toot has been favorited by other users.
 */
import { mastodon } from 'masto';

import FeatureScorer from '../FeatureScorer';
import FeatureStorage from '../../features/FeatureStore';
import { Toot } from '../../types';


export default class numFavoritesScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => FeatureStorage.getTopFavs(api),
            verboseName: "numFavorites",
            description: "Favor posts that have been favorited by a lot of other users",
            defaultWeight: 1,
        })
    }

    async score(_api: mastodon.rest.Client, toot: Toot) {
        return toot?.favouritesCount || 0;
    }
};
