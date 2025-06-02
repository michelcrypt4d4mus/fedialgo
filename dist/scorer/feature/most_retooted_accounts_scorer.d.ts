import AccountScorer from "./acccount_scorer";
import Toot from "../../api/objects/toot";
import { type StringNumberDict } from "../../types";
export default class MostRetootedAccountsScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    static buildRetootedAccounts(recentToots: Toot[]): StringNumberDict;
    static getRetootedAccounts(): Promise<StringNumberDict>;
}
