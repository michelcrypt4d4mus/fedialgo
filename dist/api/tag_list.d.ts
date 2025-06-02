import ObjWithCountList from "./obj_with_counts_list";
import Toot from "./objects/toot";
import { type MastodonTag, type NamedObjWithTootCount, type ObjListDataSource, type TagWithUsageCounts } from "../types";
export default class TagList extends ObjWithCountList<TagWithUsageCounts> {
    constructor(tags: TagWithUsageCounts[], label: ObjListDataSource);
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList;
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    static fromTrending(): Promise<TagList>;
    static fromUsageCounts(toots: Toot[], label: ObjListDataSource): TagList;
    getTag(tag: string | MastodonTag): NamedObjWithTootCount | undefined;
    removeFollowedAndMutedTags(): Promise<void>;
    removeFollowedTags(): Promise<void>;
    removeInvalidTrendingTags(): void;
    removeMutedTags(): Promise<void>;
}
