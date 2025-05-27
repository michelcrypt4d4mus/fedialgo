"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * A list of tags with usage counts.
 */
const api_1 = __importDefault(require("../api"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const string_helpers_1 = require("../../helpers/string_helpers");
const SORT_TAGS_BY = [
    "numToots",
    "name"
];
class TagList {
    tags;
    constructor(tags) {
        this.tags = tags.map(tag => {
            const newTag = tag;
            newTag.regex ||= (0, string_helpers_1.wordRegex)(tag.name);
            return newTag;
        });
    }
    // Alternate constructor, builds Tags with numToots set to the # of times the tag appears in the toots
    static fromUsageCounts(toots) {
        const tagsWithUsageCounts = toots.reduce((tagCounts, toot) => {
            toot.realToot().tags?.forEach((tag) => {
                const newTag = tag;
                newTag.numToots ??= 0;
                if (!(tag.name in tagCounts) && (newTag.numToots > 0)) {
                    console.warn(`countTags(): "${tag.name}" not in tagCounts but numToots is > 0`, tag);
                }
                tagCounts[tag.name] ??= newTag;
                tagCounts[tag.name].numToots += 1;
            });
            return tagCounts;
        }, {});
        return new TagList(Object.values(tagsWithUsageCounts));
    }
    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites() {
        return this.fromUsageCounts(await api_1.default.instance.getFavouritedToots());
    }
    static async fromFollowedTags() {
        return new TagList(await api_1.default.instance.getFollowedTags());
    }
    static async fromParticipated() {
        return this.fromUsageCounts(await api_1.default.instance.getRecentUserToots());
    }
    // Returns a dict of tag names to numToots
    numTootsLookupDict() {
        return this.tags.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {});
    }
    // Return a dictionary of tag names to tags
    tagNameDict() {
        return this.tags.reduce((tagNames, tag) => {
            tagNames[tag.name] = tag;
            return tagNames;
        }, {});
    }
    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags) {
        const tags = (0, collection_helpers_1.sortObjsByProps)(Object.values(this.tags), SORT_TAGS_BY, [false, true]);
        return numTags ? tags.slice(0, numTags) : tags;
    }
    ;
}
exports.default = TagList;
//# sourceMappingURL=tag_list.js.map