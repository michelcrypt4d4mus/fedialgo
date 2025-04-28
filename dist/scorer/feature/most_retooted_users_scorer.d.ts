import AccountScorer from "../acccount_scorer";
import { StringNumberDict } from "../../types";
export default class MostRetootedUsersScorer extends AccountScorer {
    constructor();
    featureGetter(): Promise<StringNumberDict>;
}
