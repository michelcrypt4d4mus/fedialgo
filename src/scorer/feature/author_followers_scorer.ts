/*
 * Score a toot based on how many followers the author has.
 */
import FeatureScorer from "../feature_scorer";
import Toot from "../../api/objects/toot";
import { ScoreName } from '../../enums';


export default class AuthorFollowersScorer extends FeatureScorer {
    description = "Favour accounts with a lot of followers";

    constructor() {
        super(ScoreName.AUTHOR_FOLLOWERS);
    }

    async _score(toot: Toot): Promise<number> {
        const followerCount = toot.author().followersCount;
        return followerCount > 0 ? Math.log10(followerCount) : 0;
    }
};
