/*
 * Score toots from people who follow you.
 */
import AccountScorer from './acccount_scorer';
import Account from '../../api/objects/account';
import MastoApi from '../../api/api';
import { ScoreName } from '../../enums';
import { type StringNumberDict } from '../../types';


export default class FollowersScorer extends AccountScorer {
    description = "Favour accounts who follow you";

    constructor() {
        super(ScoreName.FOLLOWERS);
    };

    async prepareScoreData(): Promise<StringNumberDict> {
        const followers = await MastoApi.instance.getFollowers();
        this.logger.debug(`Found ${followers.length} followers:`, followers);
        return Account.countAccounts(followers);
    };
};
