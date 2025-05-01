"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = exports.toFixedLocale = exports.quote = exports.logAndThrowError = exports.logTootRemoval = exports.createRandomString = exports.countInstances = exports.replaceEmojiShortcodesWithImageTags = exports.isVideo = exports.isImage = exports.htmlToText = exports.replaceHttpsLinks = exports.extractDomain = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.VIDEO_EXTENSIONS = exports.IMAGE_EXTENSIONS = exports.GIFV = exports.NULL = exports.DEFAULT_FONT_SIZE = void 0;
/*
 * Helpers for dealing with strings.
 */
const html_entities_1 = require("html-entities");
const types_1 = require("../types");
const time_helpers_1 = require("./time_helpers");
exports.DEFAULT_FONT_SIZE = 15;
exports.NULL = "<<NULL>>";
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
// Replace https links with [link to DOMAIN], e.g.
// "Check my link: https://mast.ai/foobar" => "Check my link: [link to mast.ai]"
function replaceHttpsLinks(input) {
    return input.replace(/https:\/\/([\w.-]+)\S*/g, (_, domain) => `[${domain}]`);
}
exports.replaceHttpsLinks = replaceHttpsLinks;
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
// Return true if uri ends with an image extension like .jpg or .png
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
// Count occurrences of substr within str
function countInstances(str, substr) {
    return Math.max(str.split(substr).length - 1, 0);
}
exports.countInstances = countInstances;
;
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
// Simple log helper that only fires if numRemoved > 0
function logTootRemoval(prefix, tootType, numRemoved, numTotal) {
    if (numRemoved == 0)
        return;
    console.log(`[${prefix}] Removed ${numRemoved} ${tootType} toots leaving ${numTotal} toots`);
}
exports.logTootRemoval = logTootRemoval;
;
// Log an error message and throw an Error
function logAndThrowError(message, obj) {
    if (obj) {
        console.error(message, obj);
        message += `\n${JSON.stringify(obj, null, 4)}`;
    }
    else {
        console.error(message);
    }
    throw new Error(message);
}
exports.logAndThrowError = logAndThrowError;
;
// Doublequotes
const quote = (text) => text == null ? exports.NULL : `"${text}"`;
exports.quote = quote;
// Number to string (could also be done with Math.floor(num).toLocaleString())
const toFixedLocale = (num) => {
    if (num == null)
        return exports.NULL;
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};
exports.toFixedLocale = toFixedLocale;
// console.info() with a timestamp
const logInfo = (logPrefix, message, ...args) => {
    console.info(`[${(0, time_helpers_1.nowString)()} ${logPrefix}]  ${message}`, ...args);
};
exports.logInfo = logInfo;
//# sourceMappingURL=string_helpers.js.map