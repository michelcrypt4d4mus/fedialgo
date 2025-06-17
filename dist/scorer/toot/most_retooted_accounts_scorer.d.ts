import AccountScorer from "./acccount_scorer";
import { type StringNumberDict } from "../../types";
/** Score a toot based on how many times the user has retooted the author and retooter (if it's a retoot). */
export default class MostRetootedAccountsScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
