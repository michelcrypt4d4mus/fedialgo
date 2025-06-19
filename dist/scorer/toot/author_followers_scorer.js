"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @memberof module:toot_scorers
 */
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
/**
 * Score a toot based on how many followers the author has.
 * @class AuthorFollowersScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class AuthorFollowersScorer extends toot_scorer_1.default {
    description = "Favour accounts with a lot of followers";
    constructor() {
        super(enums_1.ScoreName.AUTHOR_FOLLOWERS);
    }
    // Use log base 10 of the number of followers as the score
    async _score(toot) {
        const followerCount = toot.author.followersCount;
        return followerCount > 0 ? Math.log10(followerCount) : 0;
    }
}
exports.default = AuthorFollowersScorer;
;
//# sourceMappingURL=author_followers_scorer.js.map