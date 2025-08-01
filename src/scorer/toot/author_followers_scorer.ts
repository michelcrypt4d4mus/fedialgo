/**
 * @memberof module:toot_scorers
 */
import TootScorer from "../toot_scorer";
import type Toot from "../../api/objects/toot";
import { ScoreName } from '../../enums';


/**
 * Score a toot based on how many followers the author has.
 * @class AuthorFollowersScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class AuthorFollowersScorer extends TootScorer {
    description = "Favour accounts with a lot of followers";

    constructor() {
        super(ScoreName.AUTHOR_FOLLOWERS);
    }

    // Use log base 10 of the number of followers as the score
    async _score(toot: Toot): Promise<number> {
        const followerCount = toot.author.followersCount;
        return followerCount > 0 ? Math.log10(followerCount) : 0;
    }
};
