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
    /** Return numTags tags sorted by numToots then by name (return all if numTags is not set). */
    topTags(numTags?: number): TagWithUsageCounts[];
    /** Return the tag lists used to search for toots (participated/trending/etc) in their raw unfiltered form. */
    static rawTagLists(): Promise<Record<TagTootsCategory, TagList>>;
}
