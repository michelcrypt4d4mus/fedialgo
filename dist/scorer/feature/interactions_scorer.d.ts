import AccountScorer from "./acccount_scorer";
import { StringNumberDict } from "../../types";
export default class InteractionsScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
