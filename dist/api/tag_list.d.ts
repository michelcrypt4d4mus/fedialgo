import ObjWithCountList, { ListSource } from "./obj_with_counts_list";
import Toot from "./objects/toot";
import { type MastodonTag, type ObjWithTootCount, type ObjListDataSource, type TagWithUsageCounts } from "../types";
export default class TagList extends ObjWithCountList<TagWithUsageCounts> {
    constructor(tags: TagWithUsageCounts[], label: ListSource);
    static fromFavourites(): Promise<TagList>;
    static fromFollowedTags(tags?: TagWithUsageCounts[]): Promise<TagList>;
    static fromParticipated(): Promise<TagList>;
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList;
    static fromUsageCounts(toots: Toot[], source: ObjListDataSource): TagList;
    getTag(tag: string | MastodonTag): ObjWithTootCount | undefined;
    removeFollowedAndMutedTags(): Promise<void>;
    removeFollowedTags(): Promise<void>;
    removeInvalidTrendingTags(): void;
    removeMutedTags(): Promise<void>;
}
