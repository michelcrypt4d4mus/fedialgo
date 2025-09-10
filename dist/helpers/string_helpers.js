"use strict";
/**
 * @fileoverview Helpers for dealing with strings.
 * @module string_helpers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordsRegex = exports.wordRegex = exports.toLocaleInt = exports.replaceHttpsLinks = exports.replaceEmojiShortcodesWithImgTags = exports.ordinalSuffix = exports.optionalSuffix = exports.htmlToParagraphs = exports.htmlToText = exports.hashObject = exports.extractDomain = exports.determineMediaCategory = exports.createRandomString = exports.countInstances = exports.byteString = exports.removeTags = exports.removeMentions = exports.removeLinks = exports.removeEmojis = exports.removeDiacritics = exports.collapseWhitespace = exports.suffixedInt = exports.quoted = exports.bracketed = exports.arrowed = exports.at = exports.isEmptyStr = exports.compareStr = exports.alphabetize = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.MEDIA_FILE_EXTENSIONS = exports.GIFV = exports.TELEMETRY = exports.NULL = exports.FEDIALGO = exports.MEGABYTE = exports.KILOBYTE = exports.DEFAULT_FONT_SIZE = void 0;
const regexp_escape_1 = __importDefault(require("regexp.escape"));
const blueimp_md5_1 = __importDefault(require("blueimp-md5"));
const html_entities_1 = require("html-entities");
const lodash_1 = require("lodash");
const enums_1 = require("../enums");
// Number constants
exports.DEFAULT_FONT_SIZE = 15;
exports.KILOBYTE = 1024;
exports.MEGABYTE = exports.KILOBYTE * 1024;
// String constants
exports.FEDIALGO = 'FediAlgo';
exports.NULL = "<<NULL>>";
exports.TELEMETRY = 'TELEMETRY';
const UNKNOWN_SERVER = 'unknown.server';
// Regexes
const ACCOUNT_MENTION_REGEX = /@[\w.]+(@[-\w.]+)?/gi;
const EMOJI_REGEX = /\p{Emoji}/gu;
const HAHSTAG_REGEX = /#\w+/g;
const LINK_REGEX = /https?:\/\/([-\w.]+)\S*/gi;
const WHITESPACE_REGEX = /\s+/g;
// Multimedia types
exports.GIFV = "gifv";
exports.MEDIA_FILE_EXTENSIONS = {
    [enums_1.MediaCategory.AUDIO]: ["aac", "aif", "flac", "m4a", "mp3", "ogg", "opus", "wav"],
    [enums_1.MediaCategory.IMAGE]: ["gif", "jpg", "jpeg", "png", "webp"],
    [enums_1.MediaCategory.VIDEO]: ["mp4"],
};
exports.VIDEO_TYPES = [
    exports.GIFV,
    enums_1.MediaCategory.VIDEO,
];
// MEDIA_TYPES contains all valid values for mastodon.v1.MediaAttachment.type
exports.MEDIA_TYPES = [
    ...exports.VIDEO_TYPES,
    enums_1.MediaCategory.AUDIO,
    enums_1.MediaCategory.IMAGE,
];
/** Alphabetize an array of strings */
const alphabetize = (arr) => arr.sort(exports.compareStr);
exports.alphabetize = alphabetize;
/** For use with {@linkcode sort()} */
const compareStr = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
exports.compareStr = compareStr;
/** Check if it's empty (all whitespace or {@linkcode null} or {@linkcode undefined}) */
const isEmptyStr = (s) => (0, lodash_1.isNil)(s) || (0, lodash_1.isEmpty)(s.trim());
exports.isEmptyStr = isEmptyStr;
/** @example "string" => "@string" */
const at = (str) => str.startsWith('@') ? str : `@${str}`;
exports.at = at;
/** @example "foo" => "<foo>" */
const arrowed = (str) => str.startsWith('<') ? str : `<${str}>`;
exports.arrowed = arrowed;
/** @example "string" => "[string]" */
const bracketed = (str) => str.startsWith('[') ? str : `[${str}]`;
exports.bracketed = bracketed;
/** @example 'string' => '"string"' */
const quoted = (str) => (0, lodash_1.isNil)(str) ? exports.NULL : `"${str}"`;
exports.quoted = quoted;
/** @example 1 => "1st", 2 => "2nd", 3 => "3rd", 4 => "4th", etc. */
const suffixedInt = (n) => `${n}${(0, exports.ordinalSuffix)(n)}`;
exports.suffixedInt = suffixedInt;
/** Collapse all whitespace in a string to single spaces. */
const collapseWhitespace = (str) => str.replace(WHITESPACE_REGEX, " ").replace(/\s,/g, ",").trim();
exports.collapseWhitespace = collapseWhitespace;
/** @example ("ó" => "o", "é" => "e", etc.) */
const removeDiacritics = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
exports.removeDiacritics = removeDiacritics;
/** Remove any emojis from string. */
const removeEmojis = (str) => str.replace(EMOJI_REGEX, " ");
exports.removeEmojis = removeEmojis;
/** Remove https links from string. */
const removeLinks = (str) => str.replace(LINK_REGEX, " ");
exports.removeLinks = removeLinks;
/** Remove "@username@domain" style strings from string */
const removeMentions = (str) => str.replace(ACCOUNT_MENTION_REGEX, " ");
exports.removeMentions = removeMentions;
/** Remove all hashtags ("#someHashtag") from string. */
const removeTags = (str) => str.replace(HAHSTAG_REGEX, " ");
exports.removeTags = removeTags;
/**
 * Returns a string representation of a number of bytes in bytes, kilobytes, or megabytes.
 * @param {number} numBytes - The number of bytes.
 * @returns {string} Human-readable string representing the size.
 */
const byteString = (numBytes) => {
    if (numBytes < exports.KILOBYTE)
        return `${numBytes} bytes`;
    if (numBytes < exports.MEGABYTE)
        return `${(numBytes / exports.KILOBYTE).toFixed(1)} kilobytes`;
    return `${(numBytes / exports.MEGABYTE).toFixed(2)} MEGABYTES`;
};
exports.byteString = byteString;
/**
 * Counts the number of occurrences of a substring within a string.
 * @param {string} str - The string to search within.
 * @param {string} substr - The substring to count.
 * @returns {number} The number of times substr appears in str.
 */
function countInstances(str, substr) {
    return Math.max(str.split(substr).length - 1, 0);
}
exports.countInstances = countInstances;
;
/**
 * Creates a random alphanumeric string of the given length.
 * @param {number} length - The desired length of the random string.
 * @returns {string} The generated random string.
 */
function createRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
exports.createRandomString = createRandomString;
;
/**
 * Guesses the media category based on the file extension in the URI.
 * @param {string | null | undefined} uri - The URI to check.
 * @returns {MediaCategory | undefined} The detected media category, or undefined if not found.
 */
function determineMediaCategory(uri) {
    if (!uri)
        return undefined;
    let category;
    Object.entries(exports.MEDIA_FILE_EXTENSIONS).forEach(([mediaType, fileExtensions]) => {
        if (fileExtensions.some(ext => uri.split("?")[0].endsWith(ext))) {
            category = mediaType;
        }
    });
    return category;
}
exports.determineMediaCategory = determineMediaCategory;
;
/**
 * Extracts the domain from a URL string.
 * @param {string} inUrl - The URL to extract the domain from.
 * @returns {string} The extracted domain, or an empty string if not found.
 * @example "http://www.mast.ai/foobar" => "mast.ai"
 * @example "example.com/path" => "example.com"
 * @example "localhost:3000" => "localhost"*
 */
function extractDomain(inUrl) {
    // Add protocol if missing for URL parsing
    let url = inUrl.toLowerCase().trim();
    url = inUrl.startsWith("http") ? inUrl : `http://${inUrl}`;
    try {
        const { hostname } = new URL(url);
        return hostname.startsWith("www.") ? hostname.substring(4) : hostname;
    }
    catch {
        console.error(`extractDomain() failed to extractDomain() from "${inUrl}"`);
        return UNKNOWN_SERVER;
    }
}
exports.extractDomain = extractDomain;
;
/**
 * Takes the MD5 hash of a JavaScript object, number, or string.
 * @param {object | number | string} obj - The object, number, or string to hash.
 * @returns {string} The MD5 hash as a string.
 */
function hashObject(obj) {
    return (0, blueimp_md5_1.default)(JSON.stringify(obj));
}
exports.hashObject = hashObject;
;
/**
 * Removes HTML tags and newlines from a string and decodes HTML entities.
 * @param {string} html - The HTML string to convert.
 * @returns {string} The plain text string.
 */
function htmlToText(html) {
    let txt = html.replace(/<\/p>/gi, "\n").trim(); // Turn closed <p> tags into newlines
    txt = txt.replace(/<br\s*\/?>/gi, "\n"); // Turn <br> tags into newlines
    txt = txt.replace(/<[^>]+>/g, ""); // Strip HTML tags
    txt = txt.replace(/\n/g, " "); // Strip newlines
    return (0, exports.collapseWhitespace)((0, html_entities_1.decode)(txt)).trim(); // Decode HTML entities lik '&amp;' etc. whitespace etc.
}
exports.htmlToText = htmlToText;
;
/**
 * Breaks up an HTML string into paragraphs.
 * @param {string} html - The HTML string to split.
 * @returns {string[]} Array of paragraph strings.
 */
function htmlToParagraphs(html) {
    if (!(html.includes("</p>") || html.includes("</P>")))
        return [html];
    return html.split(/<\/p>/i).filter(p => p.length).map(p => `${p}</p>`);
}
exports.htmlToParagraphs = htmlToParagraphs;
;
/**
 * If object is not null or undefined return the result of suffixFxn(obj) with a leading space.
 * @template T
 * @param {T} obj - Object to check.
 * @param {string|function(T): string} [toSuffix] - Function to generate the suffix from the object.
 * @param {boolean} [noSpace=false] - If true, do not add a leading space to the suffix.
 * @returns {string}
 */
function optionalSuffix(obj, toSuffix, noSpace) {
    if ((0, lodash_1.isNil)(obj))
        return "";
    toSuffix ??= (o) => `${o}`;
    let suffix = typeof toSuffix === 'string' ? toSuffix : toSuffix(obj);
    suffix = noSpace ? suffix : ` ${suffix}`;
    return (0, exports.isEmptyStr)(suffix) ? "" : suffix;
}
exports.optionalSuffix = optionalSuffix;
;
/**
 * Returns the ordinal suffix for a given integer.
 * @param {number} n - The number to get the ordinal suffix for.
 * @returns {string} The ordinal suffix ("st", "nd", "rd", or "th").
 * @example 1 => "st", 2 => "nd", 3 => "rd", 4 => "th"
 */
const ordinalSuffix = (n) => {
    if (n > 3 && n < 21)
        return "th";
    switch (n % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
};
exports.ordinalSuffix = ordinalSuffix;
/**
 * Replaces custom emoji shortcodes (e.g., ":smile:") with &lt;img&gt; tags in an HTML string.
 * @param {string} html - The HTML string containing emoji shortcodes.
 * @param {mastodon.v1.CustomEmoji[]} emojis - Array of custom emoji objects.
 * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Font size for the emoji images.
 * @returns {string} The HTML string with emoji shortcodes replaced by &lt;img&gt; tags.
 */
function replaceEmojiShortcodesWithImgTags(html, emojis, fontSize = exports.DEFAULT_FONT_SIZE) {
    const fontSizeStr = `${fontSize}px`;
    emojis.forEach((emoji) => {
        const shortcode = `:${emoji.shortcode}:`;
        html = html.replace(new RegExp(shortcode, 'g'), `<img src="${emoji.url}" alt="${shortcode}" height="${fontSizeStr}" width="${fontSizeStr}">`);
    });
    return html;
}
exports.replaceEmojiShortcodesWithImgTags = replaceEmojiShortcodesWithImgTags;
;
/**
 * Replaces https links in a string with a [link to DOMAIN] format.
 * @param {string} input - The input string containing links.
 * @returns {string} The string with links replaced by [domain] tags.
 */
function replaceHttpsLinks(input) {
    return input.replace(LINK_REGEX, (_, domain) => `[${domain}]`);
}
exports.replaceHttpsLinks = replaceHttpsLinks;
;
/**
 * Converts a number to a locale-formatted string.
 * @param {number | null} num - The number to format.
 * @returns {string} The locale-formatted string or string "NULL" if {@linkcode num} is {@linkcode null}.
 */
const toLocaleInt = (num) => {
    if (num == null)
        return exports.NULL;
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};
exports.toLocaleInt = toLocaleInt;
/**
 * Creates a regex that matches a whole word, case-insensitive.
 * @param {string} pattern - The word pattern to match.
 * @returns {RegExp} The generated regular expression.
 */
const wordRegex = (pattern) => {
    return (0, exports.wordsRegex)([pattern]);
};
exports.wordRegex = wordRegex;
/**
 * Creates a regex that matches any of the given patterns as whole words, case-insensitive.
 * @param {string[]} patterns - Array of word patterns to match.
 * @returns {RegExp} The generated regular expression.
 */
const wordsRegex = (patterns) => {
    patterns = patterns.filter(pattern => !(0, exports.isEmptyStr)(pattern)); // Remove empty strings
    if (patterns.length === 0)
        return /<THIS_REGEX_MATCHES_NOTHING>/;
    const escapedPatterns = patterns.map(regexp_escape_1.default).join('|');
    return new RegExp(`\\b(?:${escapedPatterns})\\b`, 'i');
};
exports.wordsRegex = wordsRegex;
//# sourceMappingURL=string_helpers.js.map