"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordsRegex = exports.wordRegex = exports.toLocaleInt = exports.replaceHttpsLinks = exports.replaceEmojiShortcodesWithImgTags = exports.ordinalSuffix = exports.htmlToParagraphs = exports.htmlToText = exports.hashObject = exports.extractDomain = exports.determineMediaCategory = exports.createRandomString = exports.countInstances = exports.byteString = exports.removeTags = exports.removeMentions = exports.removeLinks = exports.removeEmojis = exports.removeDiacritics = exports.collapseWhitespace = exports.suffixedInt = exports.quoted = exports.prefixed = exports.bracketed = exports.arrowed = exports.at = exports.isEmptyStr = exports.compareStr = exports.alphabetize = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.MEDIA_FILE_EXTENSIONS = exports.GIFV = exports.TELEMETRY = exports.SET_LOADING_STATUS = exports.NULL = exports.FEDIALGO = exports.MEGABYTE = exports.KILOBYTE = exports.DEFAULT_FONT_SIZE = void 0;
/**
 * @fileovervier Helpers for dealing with strings.
 * @module string_helpers
 */
const escape = require('regexp.escape');
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
exports.SET_LOADING_STATUS = "SET_LOADING_STATUS";
exports.TELEMETRY = 'TELEMETRY';
// Regexes
const ACCOUNT_MENTION_REGEX = /@[\w.]+(@[-\w.]+)?/g;
const EMOJI_REGEX = /\p{Emoji}/gu;
const HAHSTAG_REGEX = /#\w+/g;
const LINK_REGEX = /https?:\/\/([-\w.]+)\S*/g;
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
/** for use with sort() */
const compareStr = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
exports.compareStr = compareStr;
/** Check if it's empty (all whitespace or null or undefined) */
const isEmptyStr = (s) => (0, lodash_1.isNil)(s) || (0, lodash_1.isEmpty)(s.trim());
exports.isEmptyStr = isEmptyStr;
/** "string" => "@string" */
const at = (str) => str.startsWith('@') ? str : `@${str}`;
exports.at = at;
/** "foo" => "<foo>" */
const arrowed = (str) => str.startsWith('<') ? str : `<${str}>`;
exports.arrowed = arrowed;
/** [Bracketed] */
const bracketed = (str) => str.startsWith('[') ? str : `[${str}]`;
exports.bracketed = bracketed;
/** Prefix a string with [Brackets] and a space */
const prefixed = (prefix, msg) => `${(0, exports.bracketed)(prefix)} ${msg}`;
exports.prefixed = prefixed;
/** Doublequotes */
const quoted = (str) => (0, lodash_1.isNil)(str) ? exports.NULL : `"${str}"`;
exports.quoted = quoted;
/** 1 => "1st", 2 => "2nd", 3 => "3rd", 4 => "4th", etc. */
const suffixedInt = (n) => `${n}${(0, exports.ordinalSuffix)(n)}`;
exports.suffixedInt = suffixedInt;
/** Collapse whitespace in a string */
const collapseWhitespace = (str) => str.replace(WHITESPACE_REGEX, " ").replace(/\s,/g, ",").trim();
exports.collapseWhitespace = collapseWhitespace;
/** Remove diacritics ("ó" => "o", "é" => "e", etc.) */
const removeDiacritics = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
exports.removeDiacritics = removeDiacritics;
/** Remove any emojis */
const removeEmojis = (str) => str.replace(EMOJI_REGEX, " ");
exports.removeEmojis = removeEmojis;
/** Remove https links from string */
const removeLinks = (str) => str.replace(LINK_REGEX, " ");
exports.removeLinks = removeLinks;
/** Remove @username@domain from string */
const removeMentions = (str) => str.replace(ACCOUNT_MENTION_REGEX, " ");
exports.removeMentions = removeMentions;
/** Remove all hashtags from string */
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
 * Extracts the domain from a URL string (e.g., "http://www.mast.ai/foobar" => "mast.ai").
 * @param {string} url - The URL to extract the domain from.
 * @returns {string} The extracted domain, or an empty string if not found.
 */
function extractDomain(url) {
    url ??= "";
    if (countInstances(url, "/") < 2) {
        console.warn(`extractDomain() found no frontslashes in: ${url}`);
        return "";
    }
    const domain = url.split("/")[2].toLowerCase();
    return domain.startsWith("www.") ? domain.substring(4) : domain;
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
 * Returns the ordinal suffix for a given integer (e.g., 1 => "st", 2 => "nd").
 * @param {number} n - The number to get the ordinal suffix for.
 * @returns {string} The ordinal suffix ("st", "nd", "rd", or "th").
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
 * Replaces custom emoji shortcodes (e.g., :smile:) with <img> tags in an HTML string.
 * @param {string} html - The HTML string containing emoji shortcodes.
 * @param {mastodon.v1.CustomEmoji[]} emojis - Array of custom emoji objects.
 * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Font size for the emoji images.
 * @returns {string} The HTML string with emoji shortcodes replaced by <img> tags.
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
 * Converts a number to a locale-formatted string, or returns NULL if the number is null.
 * @param {number | null} num - The number to format.
 * @returns {string} The locale-formatted string or NULL.
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
    if (patterns.length === 0)
        return /(?:)/; // Empty regex that matches nothing
    const escapedPatterns = patterns.map(escape).join('|');
    return new RegExp(`\\b(?:${escapedPatterns})\\b`, 'i');
};
exports.wordsRegex = wordsRegex;
//# sourceMappingURL=string_helpers.js.map