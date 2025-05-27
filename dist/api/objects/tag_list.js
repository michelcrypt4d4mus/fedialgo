"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * A list of tags with usage counts.
 */
const api_1 = __importDefault(require("../api"));
const mastodon_server_1 = __importDefault(require("../mastodon_server"));
const user_data_1 = __importDefault(require("../user_data"));
const config_1 = require("../../config");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const log_helpers_1 = require("../../helpers/log_helpers");
const string_helpers_1 = require("../../helpers/string_helpers");
const SORT_TAGS_BY = [
    "numToots",
    "name"
];
class TagList {
    tags;
    tootsConfig;
    constructor(tags, cfg) {
        this.tags = tags.map(tag => {
            const newTag = tag;
            newTag.regex ||= (0, string_helpers_1.wordRegex)(tag.name);
            return newTag;
        });
        this.tootsConfig = cfg;
    }
    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites() {
        const participatedTags = (await TagList.fromParticipated()).tagNameDict();
        const tagList = this.fromUsageCounts(await api_1.default.instance.getFavouritedToots(), config_1.config.favouritedTags);
        await tagList.removeFollowedAndMutedTags();
        await tagList.removeTrendingTags();
        // Filter out tags that are already followed or have high participation by the fedialgo user
        tagList.tags = tagList.tags.filter((tag) => {
            if (config_1.config.trending.tags.invalidTrendingTags.includes(tag.name)) {
                return false;
            }
            else if ((participatedTags[tag.name]?.numToots || 0) >= 2) { // TODO: make this a config value or (better) a heuristic based on the data
                return false;
            }
            else {
                return true;
            }
        });
        return tagList;
    }
    // Tags the user follows  // TODO: could look for tags in the accounts they follow too
    static async fromFollowedTags() {
        return new TagList(await api_1.default.instance.getFollowedTags());
    }
    // Tags the user has posted in
    static async fromParticipated() {
        return this.fromUsageCounts(await api_1.default.instance.getRecentUserToots(), config_1.config.participatedTags);
    }
    // Trending tags across the fediverse
    static async fromTrending() {
        const tagList = new TagList(await mastodon_server_1.default.fediverseTrendingTags(), config_1.config.trending.tags);
        tagList.removeFollowedAndMutedTags();
        return tagList;
    }
    // Alternate constructor, builds Tags with numToots set to the # of times the tag appears in the toots
    static fromUsageCounts(toots, cfg) {
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
        return new TagList(Object.values(tagsWithUsageCounts), cfg);
    }
    // Returns a dict of tag names to numToots
    numTootsLookupDict() {
        return this.tags.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {});
    }
    // Filter out any tags that are muted or followed
    async removeFollowedAndMutedTags() {
        await this.removeMutedTags();
        await this.removeFollowedTags();
    }
    ;
    // Screen a list of hashtags against the user's followed tags, removing any that are followed.
    async removeFollowedTags() {
        const followedKeywords = (await api_1.default.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywordsFromTags(followedKeywords);
    }
    ;
    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags() {
        this.removeKeywordsFromTags(await user_data_1.default.getMutedKeywords());
    }
    ;
    // Remove any trending tags from a list of tags
    async removeTrendingTags() {
        const trendingTagList = await TagList.fromTrending();
        this.removeKeywordsFromTags(trendingTagList.tags.map(t => t.name));
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
        numTags ||= this.tootsConfig?.numTags;
        this.tags = (0, collection_helpers_1.sortObjsByProps)(Object.values(this.tags), SORT_TAGS_BY, [false, true]);
        return numTags ? (0, collection_helpers_1.truncateToConfiguredLength)(this.tags, numTags, "topTags()") : this.tags;
    }
    // Remove tags that match any of the keywords
    async removeKeywordsFromTags(keywords) {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validTags = this.tags.filter(tag => !keywords.includes(tag.name));
        if (validTags.length != this.tags.length) {
            (0, log_helpers_1.traceLog)(`Filtered out ${this.tags.length - validTags.length} tags:`, this.tags);
        }
        this.tags = validTags;
    }
    ;
}
exports.default = TagList;
;
//# sourceMappingURL=tag_list.js.map