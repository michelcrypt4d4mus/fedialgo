import CountedList, { ListSource } from "./counted_list";
import Toot from "./objects/toot";
import { type MastodonTag, type NamedTootCount, type ObjListDataSource, type TagWithUsageCounts } from "../types";
/**
 * Subclass of ObjWithCountList for lists of TagWithUsageCounts objects.
 * @augments CountedList
 */
export default class TagList extends CountedList<TagWithUsageCounts> {
    constructor(tags: TagWithUsageCounts[], label: ListSource);
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
     * Alternate constructor that populates this.objs with TagWithUsageCounts objects with
     * numToots set to the # of times the tag appears in the 'toots' array.
     * Note the special handling of retooters.
     * @param {Toot[]} toots - Array of Toot objects to count tags from.
     * @param {ObjListDataSource} source - Source of the list (for logging/context).
     * @returns {TagList} A new TagList instance with tags counted from the toots.
     */
    static fromUsageCounts(toots: Toot[], source: ObjListDataSource, includeRetoots?: boolean): TagList;
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList;
    /**
     * Like getObj() but takes a MastodonTag argument.
     * @param {MastodonTag} tag - Tag whose name to find an obj for.
     * @returns {NamedTootCount|undefined} The NamedTootCount obj with the same name (if it exists).
     */
    getTag(tag: MastodonTag): NamedTootCount | undefined;
    /** Remove any hashtags that are followed by the FediAlgo user. */
    removeFollowedTags(): Promise<void>;
    /** Remove the configured list of invalid trending tags as well as japanese/korean etc. tags. */
    removeInvalidTrendingTags(): void;
}
