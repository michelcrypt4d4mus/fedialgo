import Toot from "./objects/toot";
import TagList from "./tag_list";
import { TagTootsConfig } from "../config";
import { Logger } from '../helpers/logger';
import { TagTootsCacheKey } from "../enums";
import { type TagWithUsageCounts } from "../types";
export default class TootsForTagsList {
    cacheKey: TagTootsCacheKey;
    config: TagTootsConfig;
    logger: Logger;
    tagList: TagList;
    static create(cacheKey: TagTootsCacheKey): Promise<TootsForTagsList>;
    private constructor();
    getToots(): Promise<Toot[]>;
    topTags(numTags?: number): TagWithUsageCounts[];
    static getToots(cacheKey: TagTootsCacheKey): Promise<Toot[]>;
    private static removeUnwantedTags;
}
