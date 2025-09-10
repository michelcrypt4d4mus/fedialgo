import type Toot from "../api/objects/toot";
import { type Logger } from "./logger";
import { type TagWithUsageCounts } from "../types";
type TagTootUris = Record<string, Set<string>>;
type TagLanguageToots = Record<string, TagTootUris>;
/**
 * Helper class to track hashtags that have been suppressed due to non-Latin script language.
 * @property {TagLanguageToots} languageTagURIs - Mapping of language codes to tag names to sets of Toot URIs.
 * @property {number} lastLoggedCount - The last total count of suppressed hashtags that was logged.
 */
declare class SuppressedHashtags {
    languageTagURIs: TagLanguageToots;
    lastLoggedCount: number;
    /**
     * Increment the count for a given tag and toot.
     * @param {TagWithUsageCounts} tag
     * @param {Toot} toot
     */
    increment(tag: TagWithUsageCounts, toot: Toot): void;
    /**
     * Log the number of suppressed hashtags by language and tag.
     * @param {Logger} logger - Logger instance to use for logging.
     */
    log(logger: Logger): void;
    /** Set of all {@linkcode Toot} URIs that had a suppressed tag. */
    private allTootURIs;
    /** Count of tag {@linkcode Toot}s per language. */
    private languageCounts;
    /** Count of tag {@linkcode Toot}s per language / tag. */
    private tagLanguageCounts;
    /**
     * Convert a {@linkcode TagTootUris} object to a {@linkcode StringNumberDict} w/length
     * of each URI string {@linkcode Set}.
     * @private
     * @param {TagTootUris} tootURIs - Mapping of tag names to sets of Toot URIs.
     * @returns {StringNumberDict} Mapping of tag names to counts of Toot URIs.
     */
    private uriCounts;
}
export declare const suppressedHashtags: SuppressedHashtags;
export {};
