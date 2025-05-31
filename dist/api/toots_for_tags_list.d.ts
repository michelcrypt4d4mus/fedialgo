import Toot from "./objects/toot";
import TagList from "./tag_list";
import { CacheKey } from "../enums";
import { TagTootsConfig } from "../config";
import { Logger } from '../helpers/logger';
import { type TagWithUsageCounts } from "../types";
export type TagTootsCacheKey = CacheKey.PARTICIPATED_TAG_TOOTS | CacheKey.FAVOURITED_HASHTAG_TOOTS | CacheKey.TRENDING_TAG_TOOTS;
export default class TootsForTagsList {
    cacheKey: TagTootsCacheKey;
    logger: Logger;
    tagList: TagList;
    tootsConfig: TagTootsConfig;
    static create(cacheKey: TagTootsCacheKey): Promise<TootsForTagsList>;
    private constructor();
    getToots(): Promise<Toot[]>;
    topTags(numTags?: number): TagWithUsageCounts[];
    static getToots(cacheKey: TagTootsCacheKey): Promise<Toot[]>;
    private static removeUnwantedTags;
}
