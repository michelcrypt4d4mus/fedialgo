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
const string_helpers_1 = require("../helpers/string_helpers");
const logger_1 = require("../helpers/logger");
const tag_1 = require("./objects/tag");
const collection_helpers_1 = require("../helpers/collection_helpers");
const logger = new logger_1.Logger("TagList");
class TagList {
    length;
    tagNames = {}; // Dict of tag names to tags
    _tags;
    constructor(tags) {
        this._tags = tags.map(tag => {
            const newTag = tag;
            (0, tag_1.repairTag)(newTag);
            newTag.regex ||= (0, string_helpers_1.wordRegex)(tag.name);
            return newTag;
        });
        this.length = this._tags.length;
        this.tagNames = this.tagNameDict();
    }
    // Alternate constructor to create synthetic tags
    static buildFromDict(dict) {
        const tags = Object.entries(dict).map(([name, numToots]) => {
            const tag = { name, numToots, url: "blank" };
            return tag;
        });
        return new TagList(tags);
    }
    get tags() {
        return this._tags;
    }
    // Has side effect of mutating the 'tagNames' dict property
    set tags(theTags) {
        this._tags = theTags;
        this.length = this._tags.length;
        this.tagNames = this.tagNameDict();
    }
    // Remove elements that don't match the predicate(). Returns a new TagList object
    filter(predicate) {
        return new TagList(this.tags.filter(predicate));
    }
    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites() {
        return TagList.fromUsageCounts(await api_1.default.instance.getFavouritedToots());
    }
    // Tags the user follows  // TODO: could look for tags in the accounts they follow too
    static async fromFollowedTags() {
        return new TagList(await api_1.default.instance.getFollowedTags());
    }
    // Tags the user has posted in
    static async fromParticipated() {
        return TagList.fromUsageCounts(await api_1.default.instance.getRecentUserToots());
    }
    // Trending tags across the fediverse, but stripped of any followed or muted tags
    static async fromTrending() {
        const trendingTagList = await mastodon_server_1.default.fediverseTrendingTags();
        await trendingTagList.removeFollowedTags();
        return trendingTagList;
    }
    // Alternate constructor, builds Tags with numToots set to the # of times the tag appears in the toots
    static fromUsageCounts(toots) {
        // If the user is mostly a retooter count retweets as toots for the purposes of counting tags
        let retootsPct = toots.length ? (toots.filter(toot => !!toot.reblog).length / toots.length) : 0;
        const isRetooter = (retootsPct > config_1.config.participatedTags.minPctToCountRetoots);
        const tagsWithUsageCounts = toots.reduce((tagCounts, toot) => {
            toot = isRetooter ? toot.realToot() : toot;
            toot.tags.forEach((tag) => {
                const newTag = Object.assign({}, tag);
                newTag.numToots ??= 0;
                if (!(tag.name in tagCounts) && (newTag.numToots > 0)) {
                    logger.warn(`<fromUsageCounts()> "${tag.name}" not in tagCounts but numToots is > 0`, tag);
                }
                tagCounts[tag.name] ??= newTag;
                tagCounts[tag.name].numToots += 1;
            });
            return tagCounts;
        }, {});
        return new TagList(Object.values(tagsWithUsageCounts));
    }
    // Return the tag if it exists in 'tags' array, otherwise undefined.
    getTag(tag) {
        const name = typeof tag === 'string' ? tag : tag.name;
        return this.tagNames[name.toLowerCase()];
    }
    map(callback) {
        return this.tags.map(callback);
    }
    maxNumAccounts() {
        const tagsNumAccounts = this.tags.map(t => t.numAccounts).filter(n => !(0, string_helpers_1.isNull)(n) && !isNaN(n));
        return tagsNumAccounts.length ? Math.max(...tagsNumAccounts) : undefined;
    }
    maxNumToots() {
        const tagsNumToots = this.tags.map(t => t.numToots).filter(n => !(0, string_helpers_1.isNull)(n) && !isNaN(n));
        return tagsNumToots.length ? Math.max(...tagsNumToots) : undefined;
    }
    // Returns a dict of tag names to numToots, which is (for now) what is used by BooleanFilter
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
            logger.trace(`Removed ${this.tags.length - validTags.length} tags matching keywords "${keywords}":`, this.tags);
        }
        this.tags = validTags;
    }
    ;
    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags() {
        this.removeKeywordsFromTags(await user_data_1.default.getMutedKeywords());
    }
    ;
    // Return numTags tags sorted by numAccounts if it exists, otherwise numToots, then by name
    // If 'numTags' is not set return all tags.
    topTags(numTags) {
        const sortBy = (this.tags.every(t => t.numAccounts) ? "numAccounts" : "numToots");
        const sortByAndName = [sortBy, "name"];
        this.tags = (0, collection_helpers_1.sortObjsByProps)(Object.values(this.tags), sortByAndName, [false, true]);
        return numTags ? this.tags.slice(0, numTags) : this.tags;
    }
    // Return a dictionary of tag names to tags
    tagNameDict() {
        return this.tags.reduce((tagNames, tag) => {
            tagNames[tag.name] = tag;
            return tagNames;
        }, {});
    }
}
exports.default = TagList;
;
//# sourceMappingURL=tag_list.js.map