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
        return Account.countAccounts(await MastoApi.instance.getFollowers());
    };
};
