import Toot from "./objects/toot";
import { MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../types";
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
    removeKeywordsFromTags(keywords: string[]): void;
    removeMutedTags(): Promise<void>;
    removeTrendingTags(): Promise<void>;
    tagNameDict(): TagNames;
    topTags(numTags?: number): TagWithUsageCounts[];
}
