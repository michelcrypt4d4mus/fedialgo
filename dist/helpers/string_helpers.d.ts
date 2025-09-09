/**
 * @fileoverview Helpers for dealing with strings.
 * @module string_helpers
 */
import { mastodon } from 'masto';
import { MediaCategory } from '../enums';
import { type OptionalString } from '../types';
export declare const DEFAULT_FONT_SIZE = 15;
export declare const KILOBYTE = 1024;
export declare const MEGABYTE: number;
export declare const FEDIALGO = "FediAlgo";
export declare const NULL = "<<NULL>>";
export declare const TELEMETRY = "TELEMETRY";
export declare const GIFV = "gifv";
export declare const MEDIA_FILE_EXTENSIONS: Record<MediaCategory, string[]>;
export declare const VIDEO_TYPES: mastodon.v1.MediaAttachmentType[];
export declare const MEDIA_TYPES: mastodon.v1.MediaAttachmentType[];
/** Alphabetize an array of strings */
export declare const alphabetize: (arr: string[]) => string[];
/** for use with sort() */
export declare const compareStr: (a: string, b: string) => number;
/** Check if it's empty (all whitespace or null or undefined) */
export declare const isEmptyStr: (s: OptionalString) => boolean;
/** "string" => "@string" */
export declare const at: (str: string) => string;
/** "foo" => "<foo>" */
export declare const arrowed: (str: string) => string;
/** "string" => "[string]" */
export declare const bracketed: (str: string) => string;
/** 'string' => '"string"' */
export declare const quoted: (str: string | null) => string;
/** 1 => "1st", 2 => "2nd", 3 => "3rd", 4 => "4th", etc. */
export declare const suffixedInt: (n: number) => string;
/** Collapse all whitespace in a string to single spaces. */
export declare const collapseWhitespace: (str: string) => string;
/** Remove diacritics ("ó" => "o", "é" => "e", etc.) */
export declare const removeDiacritics: (str: string) => string;
/** Remove any emojis from string. */
export declare const removeEmojis: (str: string) => string;
/** Remove https links from string. */
export declare const removeLinks: (str: string) => string;
/** Remove "@username@domain" style strings from string */
export declare const removeMentions: (str: string) => string;
/** Remove all hashtags ("#someHashtag") from string. */
export declare const removeTags: (str: string) => string;
/**
 * Returns a string representation of a number of bytes in bytes, kilobytes, or megabytes.
 * @param {number} numBytes - The number of bytes.
 * @returns {string} Human-readable string representing the size.
 */
export declare const byteString: (numBytes: number) => string;
/**
 * Counts the number of occurrences of a substring within a string.
 * @param {string} str - The string to search within.
 * @param {string} substr - The substring to count.
 * @returns {number} The number of times substr appears in str.
 */
export declare function countInstances(str: string, substr: string): number;
/**
 * Creates a random alphanumeric string of the given length.
 * @param {number} length - The desired length of the random string.
 * @returns {string} The generated random string.
 */
export declare function createRandomString(length: number): string;
/**
 * Guesses the media category based on the file extension in the URI.
 * @param {string | null | undefined} uri - The URI to check.
 * @returns {MediaCategory | undefined} The detected media category, or undefined if not found.
 */
export declare function determineMediaCategory(uri: OptionalString): MediaCategory | undefined;
/**
 * Extracts the domain from a URL string.
 * @param {string} inUrl - The URL to extract the domain from.
 * @returns {string} The extracted domain, or an empty string if not found.
 * @example "http://www.mast.ai/foobar" => "mast.ai"
 * @example "example.com/path" => "example.com"
 * @example "localhost:3000" => "localhost"*
 */
export declare function extractDomain(inUrl: string): string;
/**
 * Takes the MD5 hash of a JavaScript object, number, or string.
 * @param {object | number | string} obj - The object, number, or string to hash.
 * @returns {string} The MD5 hash as a string.
 */
export declare function hashObject(obj: object | number | string): string;
/**
 * Removes HTML tags and newlines from a string and decodes HTML entities.
 * @param {string} html - The HTML string to convert.
 * @returns {string} The plain text string.
 */
export declare function htmlToText(html: string): string;
/**
 * Breaks up an HTML string into paragraphs.
 * @param {string} html - The HTML string to split.
 * @returns {string[]} Array of paragraph strings.
 */
export declare function htmlToParagraphs(html: string): string[];
/**
 * If object is not null or undefined return the result of suffixFxn(obj) with a leading space.
 * @template T
 * @param {T} obj - Object to check.
 * @param {string|function(T): string} [toSuffix] - Function to generate the suffix from the object.
 * @param {boolean} [noSpace=false] - If true, do not add a leading space to the suffix.
 * @returns {string}
 */
export declare function optionalSuffix<T>(obj: T, toSuffix?: ((obj: T) => string) | string, noSpace?: boolean): string;
/**
 * Returns the ordinal suffix for a given integer.
 * @param {number} n - The number to get the ordinal suffix for.
 * @returns {string} The ordinal suffix ("st", "nd", "rd", or "th").
 * @example 1 => "st", 2 => "nd", 3 => "rd", 4 => "th"
 */
export declare const ordinalSuffix: (n: number) => string;
/**
 * Replaces custom emoji shortcodes (e.g., ":smile:") with {@linkcode <img>} tags in an HTML string.
 * @param {string} html - The HTML string containing emoji shortcodes.
 * @param {mastodon.v1.CustomEmoji[]} emojis - Array of custom emoji objects.
 * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Font size for the emoji images.
 * @returns {string} The HTML string with emoji shortcodes replaced by {@linkcode <img>} tags.
 */
export declare function replaceEmojiShortcodesWithImgTags(html: string, emojis: mastodon.v1.CustomEmoji[], fontSize?: number): string;
/**
 * Replaces https links in a string with a [link to DOMAIN] format.
 * @param {string} input - The input string containing links.
 * @returns {string} The string with links replaced by [domain] tags.
 */
export declare function replaceHttpsLinks(input: string): string;
/**
 * Converts a number to a locale-formatted string, or returns NULL if the number is null.
 * @param {number | null} num - The number to format.
 * @returns {string} The locale-formatted string or NULL.
 */
export declare const toLocaleInt: (num: number | null) => string;
/**
 * Creates a regex that matches a whole word, case-insensitive.
 * @param {string} pattern - The word pattern to match.
 * @returns {RegExp} The generated regular expression.
 */
export declare const wordRegex: (pattern: string) => RegExp;
/**
 * Creates a regex that matches any of the given patterns as whole words, case-insensitive.
 * @param {string[]} patterns - Array of word patterns to match.
 * @returns {RegExp} The generated regular expression.
 */
export declare const wordsRegex: (patterns: string[]) => RegExp;
