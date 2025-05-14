"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTags = exports.buildTagNames = exports.repairTag = void 0;
/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
const api_1 = __importDefault(require("../../api/api"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const string_helpers_1 = require("../../helpers/string_helpers");
const BROKEN_TAG = "<<BROKEN_TAG>>";
// Lowercase the tag name, replace URL with one on homeserver
function repairTag(tag) {
    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    }
    else {
        tag.name = (0, string_helpers_1.removeDiacritics)(tag.name.toLowerCase());
    }
    if (api_1.default.instance) {
        tag.url = api_1.default.instance.tagUrl(tag);
    }
    else {
        console.warn(`MastoApi.instance is null!`);
        tag.url = tag.url.toLowerCase() || "";
    }
    return tag;
}
exports.repairTag = repairTag;
;
// Build a lookup table of tag names to tag objects
function buildTagNames(tags) {
    return tags.reduce((tagNames, tag) => {
        tagNames[tag.name] = tag;
        return tagNames;
    }, {});
}
exports.buildTagNames = buildTagNames;
;
// Count up the number of tags that appear in a set of toots
function countTags(toots) {
    return toots.reduce((tagCounts, toot) => {
        toot.realToot().tags?.forEach(tag => (0, collection_helpers_1.incrementCount)(tagCounts, tag.name));
        return tagCounts;
    }, {});
}
exports.countTags = countTags;
;
//# sourceMappingURL=tag.js.map