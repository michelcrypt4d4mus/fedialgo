/*
 * CountedList subclass for TagWithUsageCounts objects.
 */
import MastoApi from "./api";
import CountedList from "./counted_list";
import UserData from "./user_data";
import type Toot from "./objects/toot";
import { config } from "../config";
import { Logger } from '../helpers/logger';
import { repairTag } from "./objects/tag";
import { TagTootsType } from "../enums";
import {
    type CountedListSource,
    type MastodonTag,
    type NamedTootCount,
    type TagWithUsageCounts,
} from "../types";

const logger = new Logger("TagList");


/**
 * Subclass of CountedList for lists of TagWithUsageCounts objects.
 * @augments CountedList
 */
export default class TagList extends CountedList<TagWithUsageCounts> {
    constructor(tags: TagWithUsageCounts[], label: CountedListSource) {
        super(tags.map(repairTag), label);
    }

    /** Alternate constructor to build tags where numToots is set to the # of times user favourited that tag. */
    static async buildFavouritedTags(): Promise<TagList> {
        return TagList.fromUsageCounts(
            await MastoApi.instance.getFavouritedToots(),
            TagTootsType.FAVOURITED
        );
    }

    /** Alternate constructor to build a list of tags the user has posted about recently. **/
    static async buildParticipatedTags(): Promise<TagList> {
        return this.fromParticipations(
            await MastoApi.instance.getRecentUserToots(),
            (await MastoApi.instance.getUserData()).isRetooter
        );
    }

    /**
     * Alternate constructor that builds a list of Tags the user has posted about based on their toot history.
     * @param {Toot[]} recentToots - Array of Toot objects to count tags from.
     * @param {boolean} [includeRetoots] - If true, includes retoots when counting tag usages.
     * @returns {TagList} A new TagList instance with tags counted from the recent user toots.
     * */
    static fromParticipations(recentToots: Toot[], includeRetoots?: boolean): TagList {
        const tagList = TagList.fromUsageCounts(recentToots, TagTootsType.PARTICIPATED, includeRetoots);
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
    static fromUsageCounts(toots: Toot[], source: CountedListSource, includeRetoots?: boolean): TagList {
        toots = includeRetoots ? toots.map(toot => toot.realToot) : toots;
        const tagList = new TagList([], source);
        const tags = toots.flatMap(toot => toot.tags);
        tagList.populateByCountingProps(tags, (tag) => tag);
        return tagList;
    }

    // Same as the superclass method. Only exists because typescript is missing a few features
    // when it comes to alternate constructors in generic classes (can't call "new TagList()" and retain
    // this subclass's methods w/out this override)
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList {
        return new TagList(this.objs.filter(predicate), this.source);
    }

    /**
     * Like getObj() but takes a MastodonTag argument.
     * @param {MastodonTag} tag - Tag whose name to find an obj for.
     * @returns {NamedTootCount|undefined} The NamedTootCount obj with the same name (if it exists).
     */
    getTag(tag: MastodonTag): NamedTootCount | undefined {
        return this.getObj(tag.name);
    }

    /** Remove any hashtags that are followed by the FediAlgo user. */
    async removeFollowedTags(): Promise<void> {
        const followedKeywords = (await MastoApi.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywords(followedKeywords);
    }

    /** Remove the configured list of invalid trending tags as well as japanese/korean etc. tags. */
    async removeInvalidTrendingTags(): Promise<void> {
        this.removeKeywords(await UserData.getMutedKeywords());
        this.removeKeywords(config.trending.tags.invalidTags);
        this.objs = this.objs.filter(tag => !tag.language || (tag.language == config.locale.language));
    }
};
