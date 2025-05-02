"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.participatedTags = exports.participatedHashtags = exports.repairTag = void 0;
const collection_helpers_1 = require("../../helpers/collection_helpers");
const api_1 = require("../../api/api");
const BROKEN_TAG = "<<BROKEN_TAG>>";
// Lowercase the tag name and URL
function repairTag(tag) {
    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    }
    else {
        tag.name = tag.name.toLowerCase();
    }
    tag.url = tag.url.toLowerCase();
    return tag;
}
exports.repairTag = repairTag;
;
// Count how many times the user has posted each tag
async function participatedHashtags() {
    const recentToots = await api_1.MastoApi.instance.getUserRecentToots();
    const hashtags = recentToots.flatMap(toot => toot.realToot().tags || []);
    return (0, collection_helpers_1.countValues)(hashtags, (tag) => tag.name);
}
exports.participatedHashtags = participatedHashtags;
;
// Count how many times the user has posted each tag
async function participatedTags() {
    const tagCounts = await participatedHashtags();
    const popularTags = (0, collection_helpers_1.sortKeysByValue)(tagCounts).slice(0, 20); // TODO: make this configurable
    return popularTags.map(tagName => ({
        name: tagName,
        url: `https://mastodon.social/tags/${tagName}`,
        numToots: tagCounts[tagName],
    }));
}
exports.participatedTags = participatedTags;
;
//# sourceMappingURL=tag.js.map