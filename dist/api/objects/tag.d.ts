import { MastodonTag, TagNames, TagWithUsageCounts } from "../../types";
export declare function buildTagNames(tags: MastodonTag[]): TagNames;
export declare function repairTag(tag: TagWithUsageCounts): TagWithUsageCounts;
export declare const tagStr: (tag: TagWithUsageCounts) => string;
