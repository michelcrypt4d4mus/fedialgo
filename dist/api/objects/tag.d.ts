import Toot from "./toot";
import { MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
export declare function buildTagNames(tags: MastodonTag[]): TagNames;
export declare function countTags(toots: Toot[]): StringNumberDict;
export declare function repairTag(tag: MastodonTag): MastodonTag;
export declare function sortTagsWithHistory(userTags: TagNames): TagWithUsageCounts[];
