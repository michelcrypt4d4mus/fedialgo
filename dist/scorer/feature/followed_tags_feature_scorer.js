"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const mastodon_api_cache_1 = __importDefault(require("../../features/mastodon_api_cache"));
const Storage_1 = require("../../Storage");
class FollowedTagsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favor toots that contain hashtags you are following",
            defaultWeight: 1,
            featureGetter: (api) => mastodon_api_cache_1.default.getFollowedTags(api),
            scoreName: Storage_1.Key.FOLLOWED_TAGS,
        });
    }
    async score(toot) {
        let containsFollowedTag = false;
        toot.tags.forEach((tootTag) => {
            if (tootTag.name in this.feature) {
                console.log(`Found followed tag ${tootTag.name} in toot:`, toot);
                containsFollowedTag = true;
            }
        });
        return containsFollowedTag ? 1 : 0;
    }
}
exports.default = FollowedTagsFeatureScorer;
;
//# sourceMappingURL=followed_tags_feature_scorer.js.map