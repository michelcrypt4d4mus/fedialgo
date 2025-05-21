/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
import Account from '../../api/objects/account';
import AccountScorer from "../acccount_scorer";
import MastoApi from "../../api/api";
import { ScoreName, StringNumberDict } from "../../types";


export default class MostRetootedAccountsScorer extends AccountScorer {
    constructor() {
        super(ScoreName.MOST_RETOOTED_ACCOUNTS);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        const recentToots = await MastoApi.instance.getRecentUserToots();
        const retootedAccounts = recentToots.filter(toot => toot?.reblog).map(toot => toot.reblog!.account);
        return Account.countAccounts(retootedAccounts);
    };
};
