/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
import Account from "../../api/objects/account";
import AccountScorer from "./acccount_scorer";
import MastoApi from "../../api/api";
import Toot from "../../api/objects/toot";
import { ScoreName } from '../../enums';
import { type StringNumberDict } from "../../types";


export default class MostRetootedAccountsScorer extends AccountScorer {
    description = "Favour accounts you often retoot";

    constructor() {
        super(ScoreName.MOST_RETOOTED_ACCOUNTS);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        return await MostRetootedAccountsScorer.getRetootedAccounts();
    };

    static buildRetootedAccounts(recentToots: Toot[]): StringNumberDict {
        const retootedAccounts = recentToots.filter(toot => toot?.reblog).map(toot => toot.reblog!.account);
        return Account.countAccounts(retootedAccounts);
    }

    static async getRetootedAccounts(): Promise<StringNumberDict> {
        return this.buildRetootedAccounts(await MastoApi.instance.getRecentUserToots());
    }
};
