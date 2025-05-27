import { TagTootsConfig } from "../../config";
import { MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
export default class TagList {
    tags: TagWithUsageCounts[];
    tootsConfig?: TagTootsConfig;
    constructor(tags: MastodonTag[], config?: TagTootsConfig);
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    static fromTrending(): Promise<TagList>;
    private static fromUsageCounts;
    numTootsLookupDict(): StringNumberDict;
    removeFollowedAndMutedTags(): Promise<void>;
    removeFollowedTags(): Promise<void>;
    removeMutedTags(): Promise<void>;
    removeTrendingTags(logPrefix?: string): Promise<void>;
    tagNameDict(): TagNames;
    topTags(numTags?: number): TagWithUsageCounts[];
    private removeKeywordsFromTags;
}
