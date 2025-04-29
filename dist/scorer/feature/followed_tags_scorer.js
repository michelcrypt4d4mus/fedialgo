"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class FollowedTagsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.FOLLOWED_TAGS);
    }
    // Return a dict keyed by tag name (values should be all 1)
    async featureGetter() {
        return (await api_1.MastoApi.instance.getUserData()).followedTags;
    }
    // Sets the followedTags property on the Toot object before returning the score
    // TODO: this is less than ideal as it mutates the Toot object. Consider refactoring.
    async _score(toot) {
        toot = toot.reblog || toot;
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.scoreData);
        return toot.followedTags.length;
    }
}
exports.default = FollowedTagsScorer;
;
//# sourceMappingURL=followed_tags_scorer.js.map