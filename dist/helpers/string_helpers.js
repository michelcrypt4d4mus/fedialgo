"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLocaleInt = exports.replaceHttpsLinks = exports.replaceEmojiShortcodesWithImageTags = exports.isVideo = exports.isImage = exports.htmlToText = exports.hashObject = exports.extractDomain = exports.createRandomString = exports.countInstances = exports.byteString = exports.isJapanese = exports.isNumber = exports.quoted = exports.bracketed = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.VIDEO_EXTENSIONS = exports.IMAGE_EXTENSIONS = exports.GIFV = exports.JAPANESE_LANGUAGE = exports.MEGABYTE = exports.KILOBYTE = exports.TELEMETRY = exports.NULL = exports.DEFAULT_FONT_SIZE = void 0;
/*
 * Helpers for dealing with strings.
 */
const blueimp_md5_1 = __importDefault(require("blueimp-md5"));
const html_entities_1 = require("html-entities");
const types_1 = require("../types");
exports.DEFAULT_FONT_SIZE = 15;
exports.NULL = "<<NULL>>";
exports.TELEMETRY = 'TELEMETRY';
exports.KILOBYTE = 1024;
exports.MEGABYTE = exports.KILOBYTE * 1024;
// Foreign languages
exports.JAPANESE_LANGUAGE = "ja";
const JAPANESE_REGEX = /^[一ー-龯ぁ-んァ-ン]{2,}/; // https://gist.github.com/terrancesnyder/1345094
// Multimedia types
exports.GIFV = "gifv";
exports.IMAGE_EXTENSIONS = ["gif", "jpg", "jpeg", "png", "webp"];
exports.VIDEO_EXTENSIONS = ["mp4"];
exports.VIDEO_TYPES = [
    exports.GIFV,
    types_1.MediaCategory.VIDEO,
];
// MEDIA_TYPES contains all valid values for mastodon.v1.MediaAttachment.type
exports.MEDIA_TYPES = [
    ...exports.VIDEO_TYPES,
    types_1.MediaCategory.AUDIO,
    types_1.MediaCategory.IMAGE,
];
// [Bracketed]
const bracketed = (str) => str.startsWith('[') ? str : `[${str}]`;
exports.bracketed = bracketed;
// Doublequotes
const quoted = (str) => str == null ? exports.NULL : `"${str}"`;
exports.quoted = quoted;
// Returns true if n is a number or a string that can be converted to a number
const isNumber = (n) => (typeof n == "number" || /^[\d.]+$/.test(n));
exports.isNumber = isNumber;
// Returns true if str is japanese
const isJapanese = (str) => JAPANESE_REGEX.test(str);
exports.isJapanese = isJapanese;
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
    txt = txt.replace(/<[^>]+>/g, ""); // Strip HTML tags
    txt = txt.replace(/\n/g, " "); // Strip newlines
    txt = txt.replace(/\s+/g, " "); // Collapse multiple spaces
    return (0, html_entities_1.decode)(txt).trim(); // Decode HTML entities lik '&amp;' etc.
}
exports.htmlToText = htmlToText;
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
    return input.replace(/https:\/\/([\w.-]+)\S*/g, (_, domain) => `[${domain}]`);
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
//# sourceMappingURL=string_helpers.js.map