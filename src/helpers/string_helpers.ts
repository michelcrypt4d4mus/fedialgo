/**
 * @fileoverview Helpers for dealing with strings.
 * @module string_helpers
 */

import escape from 'regexp.escape';
import md5 from "blueimp-md5";
import { decode } from 'html-entities';
import { isEmpty, isNil } from "lodash";
import { mastodon } from 'masto';

import { MediaCategory } from '../enums';
import { type OptionalString } from '../types';

// Number constants
export const DEFAULT_FONT_SIZE = 15;
export const KILOBYTE = 1024;
export const MEGABYTE = KILOBYTE * 1024;

// String constants
export const FEDIALGO = 'FediAlgo';
export const NULL = "<<NULL>>";
export const TELEMETRY = 'TELEMETRY';
const UNKNOWN_SERVER = 'unknown.server';

// Regexes
const ACCOUNT_MENTION_REGEX = /@[\w.]+(@[-\w.]+)?/gi;
const EMOJI_REGEX = /\p{Emoji}/gu;
const HAHSTAG_REGEX = /#\w+/g;
const LINK_REGEX = /https?:\/\/([-\w.]+)\S*/gi;
const WHITESPACE_REGEX = /\s+/g;

// Multimedia types
export const GIFV = "gifv";

export const MEDIA_FILE_EXTENSIONS: Record<MediaCategory, string[]> = {
    [MediaCategory.AUDIO]: ["aac", "aif", "flac", "m4a", "mp3", "ogg", "opus", "wav"],
    [MediaCategory.IMAGE]: ["gif", "jpg", "jpeg", "png", "webp"],
    [MediaCategory.VIDEO]: ["mp4"],
}

export const VIDEO_TYPES: mastodon.v1.MediaAttachmentType[] = [
    GIFV,
    MediaCategory.VIDEO,
];

// MEDIA_TYPES contains all valid values for mastodon.v1.MediaAttachment.type
export const MEDIA_TYPES: mastodon.v1.MediaAttachmentType[] = [
    ...VIDEO_TYPES,
    MediaCategory.AUDIO,
    MediaCategory.IMAGE,
];


/** Alphabetize an array of strings */
export const alphabetize = (arr: string[]) => arr.sort(compareStr);
/** For use with {@linkcode sort()} */
export const compareStr = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());
/** Check if it's empty (all whitespace or {@linkcode null} or {@linkcode undefined}) */
export const isEmptyStr = (s: OptionalString) => isNil(s) || isEmpty(s!.trim());

/** @example "string" => "@string" */
export const at = (str: string): string => str.startsWith('@') ? str : `@${str}`;
/** @example "foo" => "<foo>" */
export const arrowed = (str: string): string => str.startsWith('<') ? str : `<${str}>`;
/** @example "string" => "[string]" */
export const bracketed = (str: string): string => str.startsWith('[') ? str : `[${str}]`;
/** @example 'string' => '"string"' */
export const quoted = (str: string | null): string => isNil(str) ? NULL : `"${str}"`;
/** @example 1 => "1st", 2 => "2nd", 3 => "3rd", 4 => "4th", etc. */
export const suffixedInt = (n: number): string => `${n}${ordinalSuffix(n)}`;

/** Collapse all whitespace in a string to single spaces. */
export const collapseWhitespace = (str: string) => str.replace(WHITESPACE_REGEX, " ").replace(/\s,/g,  ",").trim();
/** @example ("ó" => "o", "é" => "e", etc.) */
export const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/** Remove any emojis from string. */
export const removeEmojis = (str: string) => str.replace(EMOJI_REGEX, " ");
/** Remove https links from string. */
export const removeLinks = (str: string) => str.replace(LINK_REGEX, " ");
/** Remove "@username@domain" style strings from string */
export const removeMentions = (str: string) => str.replace(ACCOUNT_MENTION_REGEX, " ");
/** Remove all hashtags ("#someHashtag") from string. */
export const removeTags = (str: string) => str.replace(HAHSTAG_REGEX, " ");


/**
 * Returns a string representation of a number of bytes in bytes, kilobytes, or megabytes.
 * @param {number} numBytes - The number of bytes.
 * @returns {string} Human-readable string representing the size.
 */
export const byteString = (numBytes: number): string => {
    if (numBytes < KILOBYTE) return `${numBytes} bytes`;
    if (numBytes < MEGABYTE) return `${(numBytes / KILOBYTE).toFixed(1)} kilobytes`;
    return `${(numBytes / MEGABYTE).toFixed(2)} MEGABYTES`;
};


/**
 * Counts the number of occurrences of a substring within a string.
 * @param {string} str - The string to search within.
 * @param {string} substr - The substring to count.
 * @returns {number} The number of times substr appears in str.
 */
export function countInstances(str: string, substr: string): number {
    return Math.max(str.split(substr).length - 1, 0);
};


/**
 * Creates a random alphanumeric string of the given length.
 * @param {number} length - The desired length of the random string.
 * @returns {string} The generated random string.
 */
export function createRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};


/**
 * Guesses the media category based on the file extension in the URI.
 * @param {string | null | undefined} uri - The URI to check.
 * @returns {MediaCategory | undefined} The detected media category, or undefined if not found.
 */
export function determineMediaCategory(uri: OptionalString): MediaCategory | undefined {
    if (!uri) return undefined;
    let category: MediaCategory | undefined;

    Object.entries(MEDIA_FILE_EXTENSIONS).forEach(([mediaType, fileExtensions]) => {
        if (fileExtensions.some(ext => uri.split("?")[0].endsWith(ext))) {
            category = mediaType as MediaCategory;
        }
    });

    return category;
};


/**
 * Extracts the domain from a URL string.
 * @param {string} inUrl - The URL to extract the domain from.
 * @returns {string} The extracted domain, or an empty string if not found.
 * @example "http://www.mast.ai/foobar" => "mast.ai"
 * @example "example.com/path" => "example.com"
 * @example "localhost:3000" => "localhost"*
 */
export function extractDomain(inUrl: string): string {
    // Add protocol if missing for URL parsing
    let url = inUrl.toLowerCase().trim();
    url = inUrl.startsWith("http") ? inUrl : `http://${inUrl}`;

    try {
        const { hostname } = new URL(url);
        return hostname.startsWith("www.") ? hostname.substring(4) : hostname;
    } catch {
        console.error(`extractDomain() failed to extractDomain() from "${inUrl}"`);
        return UNKNOWN_SERVER;
    }
};


/**
 * Takes the MD5 hash of a JavaScript object, number, or string.
 * @param {object | number | string} obj - The object, number, or string to hash.
 * @returns {string} The MD5 hash as a string.
 */
export function hashObject(obj: object | number | string): string {
    return md5(JSON.stringify(obj));
};


/**
 * Removes HTML tags and newlines from a string and decodes HTML entities.
 * @param {string} html - The HTML string to convert.
 * @returns {string} The plain text string.
 */
export function htmlToText(html: string): string {
    let txt = html.replace(/<\/p>/gi, "\n").trim();  // Turn closed <p> tags into newlines
    txt = txt.replace(/<br\s*\/?>/gi, "\n");         // Turn <br> tags into newlines
    txt = txt.replace(/<[^>]+>/g, "");               // Strip HTML tags
    txt = txt.replace(/\n/g, " ");                   // Strip newlines
    return collapseWhitespace(decode(txt)).trim();   // Decode HTML entities lik '&amp;' etc. whitespace etc.
};


/**
 * Breaks up an HTML string into paragraphs.
 * @param {string} html - The HTML string to split.
 * @returns {string[]} Array of paragraph strings.
 */
export function htmlToParagraphs(html: string): string[] {
    if (!(html.includes("</p>") || html.includes("</P>"))) return [html];
    return html.split(/<\/p>/i).filter(p => p.length).map(p => `${p}</p>`);
};



/**
 * If object is not null or undefined return the result of suffixFxn(obj) with a leading space.
 * @template T
 * @param {T} obj - Object to check.
 * @param {string|function(T): string} [toSuffix] - Function to generate the suffix from the object.
 * @param {boolean} [noSpace=false] - If true, do not add a leading space to the suffix.
 * @returns {string}
 */
export function optionalSuffix<T>(obj: T, toSuffix?: ((obj: T) => string) | string, noSpace?: boolean): string {
    if (isNil(obj)) return "";
    toSuffix ??= (o: T) => `${o}`;
    let suffix = typeof toSuffix === 'string' ? toSuffix : toSuffix(obj);
    suffix = noSpace ? suffix : ` ${suffix}`;
    return isEmptyStr(suffix) ? "" : suffix;
};


/**
 * Returns the ordinal suffix for a given integer.
 * @param {number} n - The number to get the ordinal suffix for.
 * @returns {string} The ordinal suffix ("st", "nd", "rd", or "th").
 * @example 1 => "st", 2 => "nd", 3 => "rd", 4 => "th"
 */
export const ordinalSuffix = (n: number): string => {
    if (n > 3 && n < 21) return "th";

    switch (n % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
};


/**
 * Replaces custom emoji shortcodes (e.g., ":smile:") with &lt;img&gt; tags in an HTML string.
 * @param {string} html - The HTML string containing emoji shortcodes.
 * @param {mastodon.v1.CustomEmoji[]} emojis - Array of custom emoji objects.
 * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Font size for the emoji images.
 * @returns {string} The HTML string with emoji shortcodes replaced by &lt;img&gt; tags.
 */
export function replaceEmojiShortcodesWithImgTags(
    html: string,
    emojis: mastodon.v1.CustomEmoji[],
    fontSize: number = DEFAULT_FONT_SIZE
): string {
    const fontSizeStr = `${fontSize}px`;

    emojis.forEach((emoji) => {
        const shortcode = `:${emoji.shortcode}:`;

        html = html.replace(
            new RegExp(shortcode, 'g'),
            `<img src="${emoji.url}" alt="${shortcode}" height="${fontSizeStr}" width="${fontSizeStr}">`
        );
    });

    return html;
};


/**
 * Replaces https links in a string with a [link to DOMAIN] format.
 * @param {string} input - The input string containing links.
 * @returns {string} The string with links replaced by [domain] tags.
 */
export function replaceHttpsLinks(input: string): string {
    return input.replace(LINK_REGEX, (_, domain) => `[${domain}]`);
};


/**
 * Converts a number to a locale-formatted string.
 * @param {number | null} num - The number to format.
 * @returns {string} The locale-formatted string or string "NULL" if {@linkcode num} is {@linkcode null}.
 */
export const toLocaleInt = (num: number | null): string => {
    if (num == null) return NULL;
    return num.toLocaleString(undefined, {maximumFractionDigits: 0});
};


/**
 * Creates a regex that matches a whole word, case-insensitive.
 * @param {string} pattern - The word pattern to match.
 * @returns {RegExp} The generated regular expression.
 */
export const wordRegex = (pattern: string): RegExp => {
    return wordsRegex([pattern]);
};


/**
 * Creates a regex that matches any of the given patterns as whole words, case-insensitive.
 * @param {string[]} patterns - Array of word patterns to match.
 * @returns {RegExp} The generated regular expression.
 */
export const wordsRegex = (patterns: string[]): RegExp => {
    patterns = patterns.filter(pattern => !isEmptyStr(pattern));  // Remove empty strings
    if (patterns.length === 0) return /<THIS_REGEX_MATCHES_NOTHING>/;
    const escapedPatterns = patterns.map(escape).join('|');
    return new RegExp(`\\b(?:${escapedPatterns})\\b`, 'i');
};
