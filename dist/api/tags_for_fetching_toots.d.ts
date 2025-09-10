import TagList from "./tag_list";
import type Toot from "./objects/toot";
import { type TagTootsConfig } from "../config";
import { Logger } from '../helpers/logger';
import { TagTootsCategory } from "../enums";
import { type TagWithUsageCounts } from "../types";
export default class TagsForFetchingToots {
    cacheKey: TagTootsCategory;
    config: TagTootsConfig;
    logger: Logger;
    tagList: TagList;
    /** Alternate async constructor. */
    static create(cacheKey: TagTootsCategory): Promise<TagsForFetchingToots>;
    private constructor();
    /** Get {@linkcode Toot}s for the list of tags, caching the results. */
    getToots(): Promise<Toot[]>;
    /** Strip out tags we don't want to fetch toots for, e.g. followed, muted, invalid, or trending tags. */
    private removeUnwantedTags;
    /**
     * Return {@linkcode numTags} tags sorted by {@linkcode numToots} then by {@linkcode name}
     * @param {number} [numTags] - Optional maximum number of tags to return.
     */
    topTags(numTags?: number): TagWithUsageCounts[];
    /** Return the tag lists used to search for toots (participated/trending/etc) in their raw unfiltered form. */
    static rawTagLists(): Promise<Record<TagTootsCategory, TagList>>;
}
