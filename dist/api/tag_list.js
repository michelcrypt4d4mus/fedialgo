"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * A list of tags with usage counts.
 */
const api_1 = __importDefault(require("./api"));
const mastodon_server_1 = __importDefault(require("./mastodon_server"));
const user_data_1 = __importDefault(require("./user_data"));
const config_1 = require("../config");
const tag_1 = require("./objects/tag");
const collection_helpers_1 = require("../helpers/collection_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const string_helpers_1 = require("../helpers/string_helpers");
const SORT_TAGS_BY = [
    "numToots",
    "name"
];
class TagList {
    tags;
    constructor(tags) {
        this.tags = tags.map(tag => {
            const newTag = tag;
            (0, tag_1.repairTag)(newTag);
            newTag.regex ||= (0, string_helpers_1.wordRegex)(tag.name);
            return newTag;
        });
    }
    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites() {
        return this.fromUsageCounts(await api_1.default.instance.getFavouritedToots());
    }
    // Tags the user follows  // TODO: could look for tags in the accounts they follow too
    static async fromFollowedTags() {
        return new this(await api_1.default.instance.getFollowedTags());
    }
    // Tags the user has posted in
    static async fromParticipated() {
        return this.fromUsageCounts(await api_1.default.instance.getRecentUserToots());
    }
    // Trending tags across the fediverse
    static async fromTrending() {
        const tagList = new this(await mastodon_server_1.default.fediverseTrendingTags());
        tagList.removeFollowedAndMutedTags();
        tagList.removeInvalidTrendingTags();
        return tagList;
    }
    // Alternate constructor, builds Tags with numToots set to the # of times the tag appears in the toots
    static fromUsageCounts(toots) {
        let retootsPct = toots.length ? (toots.filter(toot => !!toot.reblog).length / toots.length) : 0;
        const tagsWithUsageCounts = toots.reduce((tagCounts, toot) => {
            // If the user is mostly a retooter count retweets as toots for the purposes of counting tags
            toot = (retootsPct > config_1.config.participatedTags.minPctToCountRetoots) ? toot.realToot() : toot;
            toot.tags.forEach((tag) => {
                const newTag = Object.assign({}, tag);
                newTag.numToots ??= 0;
                if (!(tag.name in tagCounts) && (newTag.numToots > 0)) {
                    console.warn(`countTags(): "${tag.name}" not in tagCounts but numToots is > 0`, tag);
                }
                tagCounts[tag.name] ??= newTag;
                tagCounts[tag.name].numToots += 1;
            });
            return tagCounts;
        }, {});
        return new this(Object.values(tagsWithUsageCounts));
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
        await this.removeFollowedTags();
        await this.removeMutedTags();
    }
    ;
    // Screen a list of hashtags against the user's followed tags, removing any that are followed.
    async removeFollowedTags() {
        const followedKeywords = (await api_1.default.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywordsFromTags(followedKeywords);
    }
    ;
    // Remove the configured list of invalid trending tags as well as japanese/korean etc. tags
    removeInvalidTrendingTags() {
        this.removeKeywordsFromTags(config_1.config.trending.tags.invalidTags);
        this.tags = this.tags.filter(tag => (!tag.language) || (tag.language == config_1.config.locale.language));
    }
    ;
    // Remove tags that match any of the keywords
    removeKeywordsFromTags(keywords) {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validTags = this.tags.filter(tag => !keywords.includes(tag.name));
        if (validTags.length != this.tags.length) {
            (0, log_helpers_1.traceLog)(`Removed ${this.tags.length - validTags.length} tags matching keywords "${keywords}":`, this.tags);
        }
        this.tags = validTags;
    }
    ;
    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags() {
        this.removeKeywordsFromTags(await user_data_1.default.getMutedKeywords());
    }
    ;
    // Return a dictionary of tag names to tags
    tagNameDict() {
        return this.tags.reduce((tagNames, tag) => {
            tagNames[tag.name] = tag;
            return tagNames;
        }, {});
    }
    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags) {
        this.tags = (0, collection_helpers_1.sortObjsByProps)(Object.values(this.tags), SORT_TAGS_BY, [false, true]);
        return numTags ? this.tags.slice(0, numTags) : this.tags;
    }
}
exports.default = TagList;
;
//# sourceMappingURL=tag_list.js.map