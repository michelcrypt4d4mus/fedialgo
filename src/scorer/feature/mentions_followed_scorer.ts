/*
 * Score how many accounts that the user follows are mentioned in the toot.
 */
import { mastodon } from 'masto';

import Account from '../../api/objects/account';
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class MentionsFollowedScorer extends FeatureScorer {
    followedAccounts: Account[] = [];

    constructor() {
        super(WeightName.MENTIONS_FOLLOWED);
    }

    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    async featureGetter(): Promise<StringNumberDict> {
        this.followedAccounts = await MastoApi.instance.fetchFollowedAccounts();
        return countValues<Account>(this.followedAccounts, (account) => account.webfingerURI());
    };

    // TODO: Needs equivalent of webfingerURI or won't always work correctly.
    async _score(toot: Toot) {
        return toot.mentions.filter((mention) => mention.acct in this.requiredData).length;
    };
};
