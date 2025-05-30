import Toot from "./objects/toot";
import TagList from "./tag_list";
import { CacheKey } from "../enums";
import { TagTootsConfig } from "../config";
import { type TagWithUsageCounts } from "../types";
type TagTootsCacheKey = CacheKey.PARTICIPATED_TAG_TOOTS | CacheKey.FAVOURITED_HASHTAG_TOOTS | CacheKey.TRENDING_TAG_TOOTS;
export default class TootsForTagsList {
    cacheKey: TagTootsCacheKey;
    tagList: TagList;
    tootsConfig: TagTootsConfig;
    static create(cacheKey: TagTootsCacheKey): Promise<TootsForTagsList>;
    static getToots(cacheKey: TagTootsCacheKey): Promise<Toot[]>;
    private constructor();
    getToots(): Promise<Toot[]>;
    topTags(numTags?: number): TagWithUsageCounts[];
    private static removeUnwantedTags;
}
export {};
