import Toot from "./toot";
import { CacheKey, MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
import { TagTootsConfig } from "../../config";
type TagTootsCacheKey = CacheKey.PARTICIPATED_TAG_TOOTS | CacheKey.FAVOURITED_HASHTAG_TOOTS | CacheKey.TRENDING_TAG_TOOTS;
export default class TagList {
    tags: TagWithUsageCounts[];
    constructor(tags: MastodonTag[]);
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    static fromTrending(): Promise<TagList>;
    static fromUsageCounts(toots: Toot[]): TagList;
    numTootsLookupDict(): StringNumberDict;
    removeFollowedAndMutedTags(): Promise<void>;
    removeFollowedTags(): Promise<void>;
    removeInvalidTrendingTags(): void;
    removeMutedTags(): Promise<void>;
    removeTrendingTags(): Promise<void>;
    tagNameDict(): TagNames;
    topTags(numTags?: number): TagWithUsageCounts[];
    private removeKeywordsFromTags;
}
export declare class TagsForTootsList {
    cacheKey: TagTootsCacheKey;
    tagList: TagList;
    tootsConfig: TagTootsConfig;
    static create(cacheKey: TagTootsCacheKey): Promise<TagsForTootsList>;
    static getTootsForTags(cacheKey: TagTootsCacheKey): Promise<Toot[]>;
    private constructor();
    topTags(numTags?: number): TagWithUsageCounts[];
    getToots(): Promise<Toot[]>;
}
export {};
