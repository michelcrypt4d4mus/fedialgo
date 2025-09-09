"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
/**
 * Populate the {@linkcode Toot.followedTags} property on {@linkcode Toot} object and return
 * the number of tags on the {@linkcode Toot} that the user is following.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class FollowedTagsScorer extends toot_scorer_1.default {
    description = "Favour toots containing hashtags you follow";
    constructor() {
        super(enums_1.ScoreName.FOLLOWED_TAGS);
    }
    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot) {
        return toot.realToot.followedTags?.length || 0;
    }
}
exports.default = FollowedTagsScorer;
;
//# sourceMappingURL=followed_tags_scorer.js.map