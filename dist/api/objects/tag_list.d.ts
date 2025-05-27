import Toot from "./toot";
import { MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
export default class TagList {
    tags: TagWithUsageCounts[];
    constructor(tags: MastodonTag[]);
    static fromUsageCounts(toots: Toot[]): TagList;
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    numTootsLookupDict(): StringNumberDict;
    tagNameDict(): TagNames;
    topTags(numTags?: number): TagWithUsageCounts[];
}
