"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = require("../Storage");
const helpers_1 = require("../helpers");
async function FollowedTagsFeature(api) {
    const tags = await (0, helpers_1.mastodonFetchPages)({
        fetchMethod: api.v1.followedTags.list,
        label: Storage_1.Key.FOLLOWED_TAGS
    });
    console.log(`Retrieved followed tags with FollowedTagsFeature():`, tags);
    return tags.reduce((acc, tag) => {
        acc[tag.name] = 1;
        return acc;
    }, {});
}
exports.default = FollowedTagsFeature;
;
//# sourceMappingURL=followed_tags_feature.js.map