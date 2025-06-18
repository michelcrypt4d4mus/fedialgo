import { type TagWithUsageCounts } from "../../types";
/** Lowercase the tag name, replace URL with one on homeserver. */
export declare function repairTag(tag: TagWithUsageCounts): TagWithUsageCounts;
/** Create a string representation of the tag with its usage counts & language. */
export declare function tagInfoStr(tag: TagWithUsageCounts): string;
