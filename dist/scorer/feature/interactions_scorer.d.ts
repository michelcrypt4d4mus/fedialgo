import AccountScorer from "../acccount_scorer";
import { StringNumberDict } from "../../types";
export default class InteractionsScorer extends AccountScorer {
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
