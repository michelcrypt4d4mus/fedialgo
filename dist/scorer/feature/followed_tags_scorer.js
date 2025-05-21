"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Populate the 'followedTags' property on Toot object and return the number of tags
 * on the Toot that the user is following.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const types_1 = require("../../types");
class FollowedTagsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.ScoreName.FOLLOWED_TAGS);
    }
    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot) {
        return toot.realToot().followedTags?.length || 0;
    }
}
exports.default = FollowedTagsScorer;
;
//# sourceMappingURL=followed_tags_scorer.js.map