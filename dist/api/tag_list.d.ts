import CountedList from "./counted_list";
import type Toot from "./objects/toot";
import { type CountedListSource, type Hashtag, type NamedTootCount, type TagWithUsageCounts } from "../types";
/**
 * Subclass of {@linkcode CountedList} for lists of {@linkcode TagWithUsageCounts} objects.
 * @augments CountedList
 */
export default class TagList extends CountedList<TagWithUsageCounts> {
    constructor(tags: TagWithUsageCounts[], label: CountedListSource);
    /** Alternate constructor to build tags where numToots is set to the # of times user favourited that tag. */
    static buildFavouritedTags(): Promise<TagList>;
    /** Alternate constructor to build a list of tags the user has posted about recently. **/
    static buildParticipatedTags(): Promise<TagList>;
    /**
     * Alternate constructor that builds a list of Tags the user has posted about based on their toot history.
     * @param {Toot[]} recentToots - Array of Toot objects to count tags from.
     * @param {boolean} [includeRetoots] - If true, includes retoots when counting tag usages.
     * @returns {TagList} A new TagList instance with tags counted from the recent user toots.
     * */
    static fromParticipations(recentToots: Toot[], includeRetoots?: boolean): TagList;
    /**
     * Alternate constructor that populates {@linkcode this.objs} with {@linkcode TagWithUsageCounts} objects
     * with {@linkcode numToots} set to the # of times the tag appears in the {@linkcode toots} array.
     * Note the special handling of retooters.
     * @param {Toot[]} toots - Array of Toot objects to count tags from.
     * @param {CountedListSource} source - Source of the list (for logging/context).
     * @returns {TagList} A new TagList instance with tags counted from the toots.
     */
    static fromUsageCounts(toots: Toot[], source: CountedListSource, includeRetoots?: boolean): TagList;
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList;
    /**
     * Like {@linkcode CountedList.getObj} but takes a {@linkcode MastodonTag} argument.
     * @param {Hashtag} tag - Tag whose name we want to locate the object for.
     * @returns {NamedTootCount|undefined} The {@linkcode NamedTootCount} obj with the same name (if it exists).
     */
    getTag(tag: Hashtag): NamedTootCount | undefined;
    /** Remove any hashtags that are followed by the FediAlgo user. */
    removeFollowedTags(): Promise<void>;
    /** Remove the configured list of invalid trending tags as well as japanese/korean etc. tags. */
    removeInvalidTrendingTags(): Promise<void>;
}
