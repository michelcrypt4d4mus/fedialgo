import AccountScorer from "../acccount_scorer";
import { StringNumberDict } from "../../types";
export default class MostRetootedAccountsScorer extends AccountScorer {
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
