/*
 * Score how many times the toot has been favorited by other users.
 */
import FeatureScorer from '../FeatureScorer';
import FeatureStorage from '../../features/FeatureStore';
import { mastodon } from 'masto';
import { StatusType } from '../../types';


export default class numFavoritesScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (api: mastodon.rest.Client) => FeatureStorage.getTopFavs(api),
            verboseName: "numFavorites",
            description: "Favor posts that have been favorited by a lot of other users",
            defaultWeight: 1,
        })
    }

    async score(_api: mastodon.rest.Client, status: StatusType) {
        return status?.favouritesCount || 0;
    }
};
