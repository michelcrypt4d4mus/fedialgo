import Toot from "./objects/toot";
import TagList from "./tag_list";
import { TagWithUsageCounts } from "../types";
import { CacheKey } from '../Storage';
import { TagTootsConfig } from "../config";
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
