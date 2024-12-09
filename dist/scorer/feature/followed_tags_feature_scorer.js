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
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class FollowedTagsFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: () => FollowedTagsFeatureScorer.fetchRequiredData(),
            scoreName: types_1.WeightName.FOLLOWED_TAGS,
        });
    }
    async _score(toot) {
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.feature);
        return toot.followedTags.length;
    }
    static async fetchRequiredData() {
        const tags = await api_1.MastoApi.instance.getFollowedTags();
        console.log(`Retrieved followed tags with FollowedTagsFeature():`, tags);
        // Return tags a a dict of the form {tagString: 1}
        return tags.reduce((acc, tag) => {
            acc[tag.name.toLowerCase()] = 1;
            return acc;
        }, {});
    }
}
exports.default = FollowedTagsFeatureScorer;
;
//# sourceMappingURL=followed_tags_feature_scorer.js.map