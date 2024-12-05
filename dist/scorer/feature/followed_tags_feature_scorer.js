"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const mastodon_api_cache_1 = __importDefault(require("../../api/mastodon_api_cache"));
const types_1 = require("../../types");
class FollowedTagsFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: (api) => mastodon_api_cache_1.default.getFollowedTags(api),
            scoreName: types_1.WeightName.FOLLOWED_TAGS,
        });
    }
    async _score(toot) {
        toot.followedTags = toot.tags.filter((tag) => tag.name in this.feature);
        return toot.followedTags.length;
    }
}
exports.default = FollowedTagsFeatureScorer;
;
//# sourceMappingURL=followed_tags_feature_scorer.js.map