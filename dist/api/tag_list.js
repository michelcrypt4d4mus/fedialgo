"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * CountedList subclass for TagWithUsageCounts objects.
 */
const api_1 = __importDefault(require("./api"));
const counted_list_1 = __importDefault(require("./counted_list"));
const user_data_1 = __importDefault(require("./user_data"));
const config_1 = require("../config");
const logger_1 = require("../helpers/logger");
const tag_1 = require("./objects/tag");
const enums_1 = require("../enums");
const logger = new logger_1.Logger("TagList");
/**
 * Subclass of CountedList for lists of TagWithUsageCounts objects.
 * @augments CountedList
 */
class TagList extends counted_list_1.default {
    constructor(tags, label) {
        super(tags.map(tag_1.repairTag), label);
    }
    /** Alternate constructor to build tags where numToots is set to the # of times user favourited that tag. */
    static async buildFavouritedTags() {
        return TagList.fromUsageCounts(await api_1.default.instance.getFavouritedToots(), enums_1.TagTootsCategory.FAVOURITED);
    }
    /** Alternate constructor to build a list of tags the user has posted about recently. **/
    static async buildParticipatedTags() {
        return this.fromParticipations(await api_1.default.instance.getRecentUserToots(), (await api_1.default.instance.getUserData()).isRetooter);
    }
    /**
     * Alternate constructor that builds a list of Tags the user has posted about based on their toot history.
     * @param {Toot[]} recentToots - Array of Toot objects to count tags from.
     * @param {boolean} [includeRetoots] - If true, includes retoots when counting tag usages.
     * @returns {TagList} A new TagList instance with tags counted from the recent user toots.
     * */
    static fromParticipations(recentToots, includeRetoots) {
        const tagList = TagList.fromUsageCounts(recentToots, enums_1.TagTootsCategory.PARTICIPATED, includeRetoots);
        logger.trace(`fromParticipations() found ${tagList.length} tags in ${recentToots.length} recent user toots`);
        return tagList;
    }
    /**
     * Alternate constructor that populates this.objs with TagWithUsageCounts objects with
     * numToots set to the # of times the tag appears in the 'toots' array.
     * Note the special handling of retooters.
     * @param {Toot[]} toots - Array of Toot objects to count tags from.
     * @param {CountedListSource} source - Source of the list (for logging/context).
     * @returns {TagList} A new TagList instance with tags counted from the toots.
     */
    static fromUsageCounts(toots, source, includeRetoots) {
        toots = includeRetoots ? toots.map(toot => toot.realToot) : toots;
        const tagList = new TagList([], source);
        const tags = toots.flatMap(toot => toot.tags);
        tagList.populateByCountingProps(tags, (tag) => tag);
        return tagList;
    }
    // Same as the superclass method. Only exists because typescript is missing a few features
    // when it comes to alternate constructors in generic classes (can't call "new TagList()" and retain
    // this subclass's methods w/out this override)
    filter(predicate) {
        return new TagList(this.objs.filter(predicate), this.source);
    }
    /**
     * Like getObj() but takes a MastodonTag argument.
     * @param {Hashtag} tag - Tag whose name to find an obj for.
     * @returns {NamedTootCount|undefined} The NamedTootCount obj with the same name (if it exists).
     */
    getTag(tag) {
        return this.getObj(tag.name);
    }
    /** Remove any hashtags that are followed by the FediAlgo user. */
    async removeFollowedTags() {
        const followedKeywords = (await api_1.default.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywords(followedKeywords);
    }
    /** Remove the configured list of invalid trending tags as well as japanese/korean etc. tags. */
    async removeInvalidTrendingTags() {
        this.removeKeywords(await user_data_1.default.getMutedKeywords());
        this.removeKeywords(config_1.config.trending.tags.invalidTags);
        this.objs = this.objs.filter(tag => !tag.language || (tag.language == config_1.config.locale.language));
    }
}
exports.default = TagList;
;
//# sourceMappingURL=tag_list.js.map