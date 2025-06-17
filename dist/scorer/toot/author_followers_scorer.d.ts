/**
 * @memberof module:toot_scorers
 */
import Toot from "../../api/objects/toot";
import TootScorer from "../toot_scorer";
/**
 * Score a toot based on how many followers the author has.
 * @class AuthorFollowersScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class AuthorFollowersScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
