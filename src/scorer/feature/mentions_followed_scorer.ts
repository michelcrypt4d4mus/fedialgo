/*
 * Score how many accounts that the user follows are mentioned in the toot.
 */
import Account from '../../api/objects/account';
import FeatureScorer from '../feature_scorer';
import MastoApi from '../../api/api';
import Toot from '../../api/objects/toot';
import { ScoreName } from '../scorer';
import { type StringNumberDict } from '../../types';


export default class MentionsFollowedScorer extends FeatureScorer {
    description = "Favour toots that mention accounts you follow";

    constructor() {
        super(ScoreName.MENTIONS_FOLLOWED);
    }

    // Build simple dictionary of followed accounts (key is webfingerURI, value is 1)
    async prepareScoreData(): Promise<StringNumberDict> {
        // TODO: this is duplicative of the followedAccounts prop in UserData (wastes some memory, but not much)
        return Account.countAccounts(await MastoApi.instance.getFollowedAccounts())
    };

    // Toot.repair() already made StatusMention.acct fields equivalent to Account.webfingerURI
    async _score(toot: Toot) {
        return toot.realToot().mentions.filter((m) => m.acct in this.scoreData).length;
    };
};
