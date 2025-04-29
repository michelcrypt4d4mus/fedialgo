/*
 * Score how many accounts that the user follows are mentioned in the toot.
 */
import Account from '../../api/objects/account';
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { countValues } from '../../helpers/collection_helpers';
import { MastoApi } from '../../api/api';
import { StringNumberDict, WeightName } from '../../types';


export default class MentionsFollowedScorer extends FeatureScorer {
    constructor() {
        super(WeightName.MENTIONS_FOLLOWED);
    }

    // Build simple dictionary of followed accounts (key is webfingerURI, value is 1)
    // TODO: this could just return followedAccounts if the type of scoreData was extending to include AccountNames
    async featureGetter(): Promise<StringNumberDict> {
        let followedAccounts = Object.values((await MastoApi.instance.getUserData()).followedAccounts);
        return countValues<Account>(followedAccounts, (account) => account.webfingerURI);
    };

    // Toot.repair() already made StatusMention.acct fields equivalent to Account.webfingerURI
    async _score(toot: Toot) {
        return (toot.reblog || toot).mentions.filter((m) => m.acct in this.scoreData).length;
    };
};
