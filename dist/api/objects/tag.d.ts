import { type TagWithUsageCounts } from "../../types";
/**
 * Build a synthetic {@linkcode TagWithUsageCounts} for a given string.
 * @param {string} str - The string to turn into a TagWithUsageCounts
 * @returns {TagWithUsageCounts}
 */
export declare function buildTag(str: string): TagWithUsageCounts;
/** Returns true for hashtags that can count as existing in a Toot even if the "#" character wasn't used. */
export declare function isValidForSubstringSearch(tag: TagWithUsageCounts): boolean;
/** Lowercase the tag name, replace URL with one on homeserver. */
export declare function repairTag(tag: TagWithUsageCounts): TagWithUsageCounts;
/** Create a string representation of the tag with its usage counts & language. */
export declare function tagInfoStr(tag: TagWithUsageCounts): string;
