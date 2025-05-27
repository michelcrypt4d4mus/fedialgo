import Toot from "./objects/toot";
import TagList from "./tag_list";
import { CacheKey, TagWithUsageCounts } from "../types";
import { TagTootsConfig } from "../config";
type TagTootsCacheKey = CacheKey.PARTICIPATED_TAG_TOOTS | CacheKey.FAVOURITED_HASHTAG_TOOTS | CacheKey.TRENDING_TAG_TOOTS;
export default class TootsForTagsList {
    cacheKey: TagTootsCacheKey;
    tagList: TagList;
    tootsConfig: TagTootsConfig;
    static create(cacheKey: TagTootsCacheKey): Promise<TootsForTagsList>;
    static getTootsForTags(cacheKey: TagTootsCacheKey): Promise<Toot[]>;
    private constructor();
    topTags(numTags?: number): TagWithUsageCounts[];
    getToots(): Promise<Toot[]>;
}
export {};
