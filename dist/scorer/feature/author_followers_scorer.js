"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score a toot based on how many followers the author has.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const enums_1 = require("../../enums");
class AuthorFollowersScorer extends feature_scorer_1.default {
    description = "Favour accounts with a lot of followers";
    constructor() {
        super(enums_1.ScoreName.AUTHOR_FOLLOWERS);
    }
    async _score(toot) {
        const followerCount = toot.author().followersCount;
        return followerCount > 0 ? Math.log10(followerCount) : 0;
    }
}
exports.default = AuthorFollowersScorer;
;
//# sourceMappingURL=author_followers_scorer.js.map