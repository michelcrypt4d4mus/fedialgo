import type Toot from "../api/objects/toot";
import { type Logger } from "./logger";
import { type TagWithUsageCounts } from "../types";
type TagTootUris = Record<string, Set<string>>;
type TagLanguageToots = Record<string, TagTootUris>;
declare class SuppressedHashtags {
    languageTagURIs: TagLanguageToots;
    lastLoggedCount: number;
    increment(tag: TagWithUsageCounts, toot: Toot): void;
    log(logger: Logger): void;
    /** Set of all {@linkcode Toot} URIs that had a suppressed tag. */
    private allTootURIs;
    /** Count of tag {@linkcode Toot}s per language. */
    private languageCounts;
    /** Count of tag {@linkcode Toot}s per language / tag. */
    private tagLanguageCounts;
    /** Convert a TagTootUris object to a StringNumberDict w/length of each URI string Set. */
    private uriCounts;
}
export declare const suppressedHashtags: SuppressedHashtags;
export {};
