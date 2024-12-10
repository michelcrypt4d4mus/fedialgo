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
const helpers_1 = require("../../helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class FollowedTagsFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.FOLLOWED_TAGS);
    }
    async featureGetter() {
        const tags = await api_1.MastoApi.instance.getFollowedTags();
        return (0, helpers_1.countValues)(tags, (tag) => tag.name?.toLowerCase());
    }
    async _score(toot) {
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.requiredData);
        return toot.followedTags.length;
    }
}
exports.default = FollowedTagsFeatureScorer;
;
//# sourceMappingURL=followed_tags_feature_scorer.js.map