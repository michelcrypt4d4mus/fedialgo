import Toot from "./objects/toot";
import { type MastodonTag, type StringNumberDict, type TagNames, type TagWithUsageCounts } from "../types";
export default class TagList {
    tags: TagWithUsageCounts[];
    constructor(tags: MastodonTag[]);
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList;
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    static fromTrending(): Promise<TagList>;
    static fromUsageCounts(toots: Toot[]): TagList;
    length(): number;
    numTootsLookupDict(): StringNumberDict;
    removeFollowedAndMutedTags(): Promise<void>;
    removeFollowedTags(): Promise<void>;
    removeInvalidTrendingTags(): void;
    removeKeywordsFromTags(keywords: string[]): void;
    removeMutedTags(): Promise<void>;
    tagNameDict(): TagNames;
    topTags(numTags?: number): TagWithUsageCounts[];
}
