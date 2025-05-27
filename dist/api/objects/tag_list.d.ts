import { MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
export default class TagList {
    tags: TagWithUsageCounts[];
    constructor(tags: MastodonTag[]);
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    private static fromUsageCounts;
    numTootsLookupDict(): StringNumberDict;
    tagNameDict(): TagNames;
    topTags(numTags?: number): TagWithUsageCounts[];
}
