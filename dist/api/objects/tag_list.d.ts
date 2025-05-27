import Toot from "./toot";
import { TagTootsConfig } from "../../config";
import { MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
export default class TagList {
    tags: TagWithUsageCounts[];
    tootsConfig?: TagTootsConfig;
    constructor(tags: MastodonTag[], cfg?: TagTootsConfig);
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    static fromTrending(): Promise<TagList>;
    static fromUsageCounts(toots: Toot[], cfg?: TagTootsConfig): TagList;
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
