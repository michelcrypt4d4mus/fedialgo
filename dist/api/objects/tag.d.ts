import { type TagWithUsageCounts } from "../../types";
/**
 * Build a synthetic {@linkcode TagWithUsageCounts} for a given string.
 * @param {string} str - The string to turn into a {@linkcode TagWithUsageCounts}
 * @returns {TagWithUsageCounts}
 */
export declare function buildTag(str: string): TagWithUsageCounts;
/**
 * Returns {@linkcode true} for hashtags that are searchable as a string even if the "#" prefix wasn't used,
 * which is true for most tags except single-letter tags and configured "tag only" strings.
 * @param {TagWithUsageCounts} tag - The tag to check.
 * @returns {boolean}
 */
export declare function isValidForSubstringSearch(tag: TagWithUsageCounts): boolean;
/** Lowercase the tag name, replace URL with one on homeserver. */
export declare function repairTag(tag: TagWithUsageCounts): TagWithUsageCounts;
/** Create a string representation of the tag with its usage counts & language. */
export declare function tagInfoStr(tag: TagWithUsageCounts): string;
