"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class FollowedTagsScorer extends feature_scorer_1.default {
    followedTags = [];
    constructor() {
        super(types_1.WeightName.FOLLOWED_TAGS);
    }
    // Return a dict keyed by tag name (values should be all 1)
    async featureGetter() {
        this.followedTags = await api_1.MastoApi.instance.getFollowedTags();
        return (0, collection_helpers_1.countValues)(this.followedTags, tag => tag.name);
    }
    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot) {
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.requiredData);
        return toot.followedTags.length;
    }
}
exports.default = FollowedTagsScorer;
;
//# sourceMappingURL=followed_tags_scorer.js.map