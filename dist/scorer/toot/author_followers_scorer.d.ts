/**
 * @memberof module:toot_scorers
 */
import TootScorer from "../toot_scorer";
import type Toot from "../../api/objects/toot";
/**
 * Score a {@linkcode Toot} based on how many followers the author has.
 * @class AuthorFollowersScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class AuthorFollowersScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
