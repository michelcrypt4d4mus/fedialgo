"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = require("../Storage");
const api_1 = require("../api/api");
async function FollowedTagsFeature(api, _user) {
    const tags = await (0, api_1.mastodonFetchPages)({
        fetchMethod: api.v1.followedTags.list,
        label: Storage_1.Key.FOLLOWED_TAGS
    });
    console.log(`Retrieved followed tags with FollowedTagsFeature():`, tags);
    // Return tags a a dict of the form {tagString: 1}
    return tags.reduce((acc, tag) => {
        acc[tag.name.toLowerCase()] = 1;
        return acc;
    }, {});
}
exports.default = FollowedTagsFeature;
;
//# sourceMappingURL=followed_tags_feature.js.map