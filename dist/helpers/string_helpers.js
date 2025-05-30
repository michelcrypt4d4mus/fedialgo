"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordRegex = exports.toLocaleInt = exports.replaceHttpsLinks = exports.replaceEmojiShortcodesWithImageTags = exports.suffixedInt = exports.ordinalSuffix = exports.isVideo = exports.isImage = exports.htmlToParagraphs = exports.htmlToText = exports.hashObject = exports.extractDomain = exports.createRandomString = exports.countInstances = exports.byteString = exports.removeTags = exports.removeMentions = exports.removeLinks = exports.removeEmojis = exports.removeDiacritics = exports.collapseWhitespace = exports.quoted = exports.prefixed = exports.bracketed = exports.arrowed = exports.at = exports.compareStr = exports.alphabetize = exports.isString = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.VIDEO_EXTENSIONS = exports.IMAGE_EXTENSIONS = exports.GIFV = exports.NUMBER_REGEX = exports.TELEMETRY = exports.SET_LOADING_STATUS = exports.NULL = exports.FEDIALGO = exports.MEGABYTE = exports.KILOBYTE = exports.DEFAULT_FONT_SIZE = void 0;
/*
 * Helpers for dealing with strings.
 */
const escape = require('regexp.escape');
const blueimp_md5_1 = __importDefault(require("blueimp-md5"));
const html_entities_1 = require("html-entities");
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
exports.NUMBER_REGEX = /^[\d.]+$/;
const ACCOUNT_MENTION_REGEX = /@[\w.]+(@[-\w.]+)?/g;
const EMOJI_REGEX = /\p{Emoji}/gu;
const HAHSTAG_REGEX = /#\w+/g;
const LINK_REGEX = /https?:\/\/([-\w.]+)\S*/g;
const WHITESPACE_REGEX = /\s+/g;
// Multimedia types
exports.GIFV = "gifv";
exports.IMAGE_EXTENSIONS = ["gif", "jpg", "jpeg", "png", "webp"];
exports.VIDEO_EXTENSIONS = ["mp4"];
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
// Check if it's a string
const isString = (s) => typeof s === 'string'; // || s instanceof String; // TODO: wtf is String about?
exports.isString = isString;
// Alphabetize an array of strings
const alphabetize = (arr) => arr.sort(exports.compareStr);
exports.alphabetize = alphabetize;
// for use with sort()
const compareStr = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
exports.compareStr = compareStr;
// "string" => "@string"
const at = (str) => str.startsWith('@') ? str : `@${str}`;
exports.at = at;
// "foo" => "<foo>"
const arrowed = (str) => str.startsWith('<') ? str : `<${str}>`;
exports.arrowed = arrowed;
// [Bracketed]
const bracketed = (str) => str.startsWith('[') ? str : `[${str}]`;
exports.bracketed = bracketed;
// Prefix a string with [Brackets] and a space
const prefixed = (prefix, msg) => `${(0, exports.bracketed)(prefix)} ${msg}`;
exports.prefixed = prefixed;
// Doublequotes
const quoted = (str) => str == null ? exports.NULL : `"${str}"`;
exports.quoted = quoted;
// Collapse whitespace in a string
const collapseWhitespace = (str) => str.replace(WHITESPACE_REGEX, " ").replace(/\s,/g, ",").trim();
exports.collapseWhitespace = collapseWhitespace;
// Remove diacritics ("ó" => "o", "é" => "e", etc.)
const removeDiacritics = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
exports.removeDiacritics = removeDiacritics;
// Remove any emojis
const removeEmojis = (str) => str.replace(EMOJI_REGEX, " ");
exports.removeEmojis = removeEmojis;
// Remove https links from string
const removeLinks = (str) => str.replace(LINK_REGEX, " ");
exports.removeLinks = removeLinks;
// Remove @username@domain from string
const removeMentions = (str) => str.replace(ACCOUNT_MENTION_REGEX, " ");
exports.removeMentions = removeMentions;
// Remove all tags from string
const removeTags = (str) => str.replace(HAHSTAG_REGEX, " ");
exports.removeTags = removeTags;
// Return a string representation of a number of bytes
const byteString = (numBytes) => {
    if (numBytes < exports.KILOBYTE)
        return `${numBytes} bytes`;
    if (numBytes < exports.MEGABYTE)
        return `${(numBytes / exports.KILOBYTE).toFixed(1)} kilobytes`;
    return `${(numBytes / exports.MEGABYTE).toFixed(2)} MEGABYTES`;
};
exports.byteString = byteString;
// Count occurrences of substr within str
function countInstances(str, substr) {
    return Math.max(str.split(substr).length - 1, 0);
}
exports.countInstances = countInstances;
;
// Create a random string of the given length
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
// "http://www.mast.ai/foobar" => "mast.ai"
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
// Take the MD5 hash of a jacascript object / number / string
function hashObject(obj) {
    return (0, blueimp_md5_1.default)(JSON.stringify(obj));
}
exports.hashObject = hashObject;
;
// Remove HTML tags and newlines from a string; decode HTML entities
function htmlToText(html) {
    let txt = html.replace(/<\/p>/gi, "\n").trim(); // Turn closed <p> tags into newlines
    txt = txt.replace(/<br\s*\/?>/gi, "\n"); // Turn <br> tags into newlines
    txt = txt.replace(/<[^>]+>/g, ""); // Strip HTML tags
    txt = txt.replace(/\n/g, " "); // Strip newlines
    return (0, exports.collapseWhitespace)((0, html_entities_1.decode)(txt)).trim(); // Decode HTML entities lik '&amp;' etc. whitespace etc.
}
exports.htmlToText = htmlToText;
;
// Break up an HTML string into paragraphs
function htmlToParagraphs(html) {
    if (!(html.includes("</p>") || html.includes("</P>")))
        return [html];
    return html.split(/<\/p>/i).filter(p => p.length).map(p => `${p}</p>`);
}
exports.htmlToParagraphs = htmlToParagraphs;
;
// Return true if uri ends with an image extension like .jpg or .png
function isImage(uri) {
    if (!uri)
        return false;
    return exports.IMAGE_EXTENSIONS.some(ext => uri.split("?")[0].endsWith(ext));
}
exports.isImage = isImage;
;
// Return true if uri ends with a video extension like .mp4 or .gifv
function isVideo(uri) {
    if (!uri)
        return false;
    return exports.VIDEO_EXTENSIONS.some(ext => uri.split("?")[0].endsWith(ext));
}
exports.isVideo = isVideo;
;
// 1st, 2nd, 3rd, 4th, etc.
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
const suffixedInt = (n) => {
    return `${n}${(0, exports.ordinalSuffix)(n)}`;
};
exports.suffixedInt = suffixedInt;
// Replace custom emoji shortcodes like :smile: with <img> tags
function replaceEmojiShortcodesWithImageTags(html, emojis, fontSize = exports.DEFAULT_FONT_SIZE) {
    const fontSizeStr = `${fontSize}px`;
    emojis.forEach((emoji) => {
        const shortcode = `:${emoji.shortcode}:`;
        html = html.replace(new RegExp(shortcode, 'g'), `<img src="${emoji.url}" alt="${shortcode}" height="${fontSizeStr}" width="${fontSizeStr}">`);
    });
    return html;
}
exports.replaceEmojiShortcodesWithImageTags = replaceEmojiShortcodesWithImageTags;
;
// Replace https links with [link to DOMAIN], e.g.
// "Check my link: https://mast.ai/foobar" => "Check my link: [link to mast.ai]"
function replaceHttpsLinks(input) {
    return input.replace(LINK_REGEX, (_, domain) => `[${domain}]`);
}
exports.replaceHttpsLinks = replaceHttpsLinks;
;
// Number to string (could also be done with Math.floor(num).toLocaleString())
const toLocaleInt = (num) => {
    if (num == null)
        return exports.NULL;
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};
exports.toLocaleInt = toLocaleInt;
// Create a regex that matches a whole word, case-insensitive
const wordRegex = (pattern) => {
    return new RegExp(`\\b${escape(pattern.trim())}\\b`, 'i');
};
exports.wordRegex = wordRegex;
//# sourceMappingURL=string_helpers.js.map