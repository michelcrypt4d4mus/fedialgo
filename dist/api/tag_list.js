"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Special case of ObjWithCountList for lists of Tag objects.
 */
const api_1 = __importDefault(require("./api"));
const obj_with_counts_list_1 = __importDefault(require("./obj_with_counts_list"));
const user_data_1 = __importDefault(require("./user_data"));
const config_1 = require("../config");
const logger_1 = require("../helpers/logger");
const tag_1 = require("./objects/tag");
const enums_1 = require("../enums");
const logger = new logger_1.Logger("TagList");
/**
 * Special case of ObjWithCountList for lists of TagWithUsageCounts objects.
 * @extends {ObjWithCountList}
 */
class TagList extends obj_with_counts_list_1.default {
    constructor(tags, label) {
        super(tags.map(tag_1.repairTag), label);
    }
    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites() {
        return TagList.fromUsageCounts(await api_1.default.instance.getFavouritedToots(), enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    }
    // Alternate constructor for tags the user follows
    static async fromFollowedTags(tags) {
        tags ||= await api_1.default.instance.getFollowedTags();
        return new TagList(tags, enums_1.ScoreName.FOLLOWED_TAGS);
    }
    // Alternate constructor for tags the user has posted in
    static async fromParticipated() {
        return TagList.fromUsageCounts(await api_1.default.instance.getRecentUserToots(), enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
    }
    // Remove elements that don't match the predicate(). Returns a new TagList object.
    // Really only exists because typescript is weird about alternate constructors with generics.
    filter(predicate) {
        return new TagList(this.objs.filter(predicate), this.source);
    }
    // Alternate constructor, builds TagWithUsageCounts objects with numToots set to the
    // # of times the tag appears in the 'toots' array of Toot objects.
    static fromUsageCounts(toots, source) {
        // If the user is mostly a retooter count retweets as toots for the purposes of counting tags
        let retootsPct = toots.length ? (toots.filter(toot => !!toot.reblog).length / toots.length) : 0;
        const isRetooter = (retootsPct > config_1.config.participatedTags.minPctToCountRetoots);
        toots = isRetooter ? toots.map(toot => toot.realToot) : toots;
        const tagList = new TagList([], source);
        const tags = toots.flatMap(toot => toot.tags);
        tagList.populateByCountingProps(tags, (tag) => tag);
        return tagList;
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
}
exports.default = TagList;
;
//# sourceMappingURL=tag_list.js.map