"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Special case of ObjWithCountList for lists of Tag objects.
 */
const api_1 = __importDefault(require("./api"));
const mastodon_server_1 = __importDefault(require("./mastodon_server"));
const obj_with_counts_list_1 = __importDefault(require("./obj_with_counts_list"));
const user_data_1 = __importDefault(require("./user_data"));
const config_1 = require("../config");
const logger_1 = require("../helpers/logger");
const tag_1 = require("./objects/tag");
const enums_1 = require("../enums");
const logger = new logger_1.Logger("TagList");
class TagList extends obj_with_counts_list_1.default {
    constructor(tags, label) {
        super(tags.map(tag_1.repairTag), label);
    }
    // Remove elements that don't match the predicate(). Returns a new TagList object
    filter(predicate) {
        return new TagList(this.objs.filter(predicate), this.source);
    }
    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites() {
        return TagList.fromUsageCounts(await api_1.default.instance.getFavouritedToots(), enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    }
    // Tags the user follows  // TODO: could look for tags in the accounts they follow too
    static async fromFollowedTags() {
        return new TagList(await api_1.default.instance.getFollowedTags(), enums_1.ScoreName.FOLLOWED_TAGS);
    }
    // Tags the user has posted in
    static async fromParticipated() {
        return TagList.fromUsageCounts(await api_1.default.instance.getRecentUserToots(), enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    }
    // Trending tags across the fediverse, but stripped of any followed or muted tags
    static async fromTrending() {
        const trendingTagList = await mastodon_server_1.default.fediverseTrendingTags();
        await trendingTagList.removeFollowedTags();
        return trendingTagList;
    }
    // Alternate constructor, builds TagWithUsageCounts objects with numToots set to the
    // # of times the tag appears in 'toots'.
    static fromUsageCounts(toots, label) {
        // If the user is mostly a retooter count retweets as toots for the purposes of counting tags
        let retootsPct = toots.length ? (toots.filter(toot => !!toot.reblog).length / toots.length) : 0;
        const isRetooter = (retootsPct > config_1.config.participatedTags.minPctToCountRetoots);
        const tagsWithUsageCounts = toots.reduce((tagCounts, toot) => {
            toot = isRetooter ? toot.realToot() : toot;
            toot.tags.forEach((tag) => {
                const newTag = Object.assign({}, tag);
                newTag.numToots ??= 0;
                tagCounts[tag.name] ??= newTag;
                tagCounts[tag.name].numToots += 1;
            });
            return tagCounts;
        }, {});
        return new this(Object.values(tagsWithUsageCounts), label);
    }
    // Return the tag if it exists in 'tags' array, otherwise undefined.
    getTag(tag) {
        return this.getObj(typeof tag == "string" ? tag : tag.name);
    }
    // Filter out any tags that are muted or followed
    async removeFollowedAndMutedTags() {
        await this.removeFollowedTags();
        await this.removeMutedTags();
    }
    // Screen a list of hashtags against the user's followed tags, removing any that are followed.
    async removeFollowedTags() {
        const followedKeywords = (await api_1.default.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywords(followedKeywords);
    }
    // Remove the configured list of invalid trending tags as well as japanese/korean etc. tags
    removeInvalidTrendingTags() {
        this.removeKeywords(config_1.config.trending.tags.invalidTags);
        this.objs = this.objs.filter(tag => !tag.language || (tag.language == config_1.config.locale.language));
    }
    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags() {
        this.removeKeywords(await user_data_1.default.getMutedKeywords());
    }
    // Return the tag lists used to search for toots (participated/trending/favourited) in their raw unfiltered form
    static async allTagTootsLists() {
        const tagLists = await Promise.all([
            TagList.fromFavourites(),
            TagList.fromParticipated(),
            TagList.fromTrending(),
        ]);
        return {
            [enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS]: tagLists[0],
            [enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]: tagLists[1],
            [enums_1.TagTootsCacheKey.TRENDING_TAG_TOOTS]: tagLists[2],
        };
    }
}
exports.default = TagList;
;
//# sourceMappingURL=tag_list.js.map