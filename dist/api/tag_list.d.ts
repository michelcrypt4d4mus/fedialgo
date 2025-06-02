import Toot from "./objects/toot";
import { type MastodonTag, type StringNumberDict, type TagNames, type TagWithUsageCounts } from "../types";
export default class TagList {
    length: number;
    tagNames: TagNames;
    private _tags;
    constructor(tags: MastodonTag[]);
    get tags(): TagWithUsageCounts[];
    set tags(theTags: TagWithUsageCounts[]);
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList;
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    static fromTrending(): Promise<TagList>;
    static fromUsageCounts(toots: Toot[]): TagList;
    getTag(tag: string | MastodonTag): TagWithUsageCounts | undefined;
    map<T>(callback: (tag: TagWithUsageCounts) => T): T[];
    maxNumAccounts(): number | undefined;
    maxNumToots(): number | undefined;
    numTootsLookupDict(): StringNumberDict;
    removeFollowedAndMutedTags(): Promise<void>;
    removeFollowedTags(): Promise<void>;
    removeInvalidTrendingTags(): void;
    removeKeywordsFromTags(keywords: string[]): void;
    removeMutedTags(): Promise<void>;
    topTags(numTags?: number): TagWithUsageCounts[];
    private tagNameDict;
}
