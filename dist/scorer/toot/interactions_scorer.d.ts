import AccountScorer from "./acccount_scorer";
import { type StringNumberDict } from "../../types";
/**
 * Gives higher weight to posts from users that have often interacted with your posts.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class InteractionsScorer extends AccountScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
}
