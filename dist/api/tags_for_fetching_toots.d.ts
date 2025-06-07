import Toot from "./objects/toot";
import TagList from "./tag_list";
import { TagTootsConfig } from "../config";
import { Logger } from '../helpers/logger';
import { TagTootsCacheKey } from "../enums";
import { type TagWithUsageCounts } from "../types";
export default class TagsForFetchingToots {
    cacheKey: TagTootsCacheKey;
    config: TagTootsConfig;
    logger: Logger;
    tagList: TagList;
    static create(cacheKey: TagTootsCacheKey): Promise<TagsForFetchingToots>;
    private constructor();
    getToots(): Promise<Toot[]>;
    private removeUnwantedTags;
    topTags(numTags?: number): TagWithUsageCounts[];
    static rawTagLists(): Promise<Record<TagTootsCacheKey, TagList>>;
}
