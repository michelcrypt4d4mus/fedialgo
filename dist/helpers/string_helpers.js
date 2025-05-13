"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLocaleInt = exports.replaceHttpsLinks = exports.replaceEmojiShortcodesWithImageTags = exports.removeTags = exports.removeOctothorpe = exports.removeMentions = exports.removeLinks = exports.removeEmojis = exports.isVideo = exports.isImage = exports.htmlToText = exports.hashObject = exports.extractDomain = exports.detectLangInfo = exports.detectLanguage = exports.createRandomString = exports.countInstances = exports.byteString = exports.compareStr = exports.isNumber = exports.quoted = exports.bracketed = exports.LANGUAGE_REGEXES = exports.RUSSIAN_LANGUAGE = exports.RUSSIAN_LOCALE = exports.KOREAN_LANGUAGE = exports.KOREAN_LOCALE = exports.JAPANESE_LANGUAGE = exports.JAPANESE_LOCALE = exports.GREEK_LANGUAGE = exports.GREEK_LOCALE = exports.ARABIC_LANGUAGE = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.VIDEO_EXTENSIONS = exports.IMAGE_EXTENSIONS = exports.GIFV = exports.VERY_HIGH_LANG_ACCURACY = exports.MIN_ALT_LANG_ACCURACY = exports.MIN_LANG_ACCURACY = exports.TELEMETRY = exports.NULL = exports.FEDIALGO = exports.MEGABYTE = exports.KILOBYTE = exports.DEFAULT_FONT_SIZE = void 0;
/*
 * Helpers for dealing with strings.
 */
const languagedetect_1 = __importDefault(require("languagedetect"));
const blueimp_md5_1 = __importDefault(require("blueimp-md5"));
const html_entities_1 = require("html-entities");
const tinyld_1 = require("tinyld");
const language_helper_1 = require("./language_helper");
const types_1 = require("../types");
// Number constants
exports.DEFAULT_FONT_SIZE = 15;
exports.KILOBYTE = 1024;
exports.MEGABYTE = exports.KILOBYTE * 1024;
// String constants
exports.FEDIALGO = 'FediAlgo';
exports.NULL = "<<NULL>>";
exports.TELEMETRY = 'TELEMETRY';
exports.MIN_LANG_ACCURACY = 0.4;
exports.MIN_ALT_LANG_ACCURACY = 0.2; // LanguageDetect never gets very high accuracy
exports.VERY_HIGH_LANG_ACCURACY = 0.85;
const LANGUAGE_DETECTOR = new languagedetect_1.default();
const IGNORE_LANGUAGES = [
    "ber",
    "eo",
    "tk",
    "tlh", // Klingon
];
const OVERCONFIDENT_LANGUAGES = [
    "da",
    "fr",
];
const EMOJI_REGEX = /\p{Emoji}/gu;
const LINK_REGEX = /https?:\/\/([-\w.]+)\S*/g;
const MENTION_REGEX = /@[\w.]+(@[-\w.]+)?/g;
const OCTOTHORPE_REGEX = /#/gi;
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
// International locales, see: https://gist.github.com/wpsmith/7604842
exports.ARABIC_LANGUAGE = "ar";
exports.GREEK_LOCALE = "el-GR";
exports.GREEK_LANGUAGE = exports.GREEK_LOCALE.split("-")[0];
exports.JAPANESE_LOCALE = "ja-JP";
exports.JAPANESE_LANGUAGE = exports.JAPANESE_LOCALE.split("-")[0];
exports.KOREAN_LOCALE = "ko-KR";
exports.KOREAN_LANGUAGE = exports.KOREAN_LOCALE.split("-")[0];
exports.RUSSIAN_LOCALE = "ru-RU";
exports.RUSSIAN_LANGUAGE = exports.RUSSIAN_LOCALE.split("-")[0];
// See https://www.regular-expressions.info/unicode.html for unicode regex scripts
exports.LANGUAGE_REGEXES = {
    [exports.ARABIC_LANGUAGE]: new RegExp(`^[\\p{Script=Arabic}\\d]+$`, 'v'),
    [exports.GREEK_LANGUAGE]: new RegExp(`^[\\p{Script=Greek}\\d]+$`, 'v'),
    [exports.JAPANESE_LANGUAGE]: new RegExp(`^[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]{2,}[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\da-z]*$`, 'v'),
    [exports.KOREAN_LANGUAGE]: new RegExp(`^[\\p{Script=Hangul}\\d]+$`, 'v'),
    [exports.RUSSIAN_LANGUAGE]: new RegExp(`^[\\p{Script=Cyrillic}\\d]+$`, 'v'),
};
// [Bracketed]
const bracketed = (str) => str.startsWith('[') ? str : `[${str}]`;
exports.bracketed = bracketed;
// Doublequotes
const quoted = (str) => str == null ? exports.NULL : `"${str}"`;
exports.quoted = quoted;
// Returns true if n is a number or a string that can be converted to a number
const isNumber = (n) => (typeof n == "number") || /^[\d.]+$/.test(n);
exports.isNumber = isNumber;
// for use with sort()
const compareStr = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
exports.compareStr = compareStr;
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
// Returns the language code of the matched regex (if any)
const detectLanguage = (str) => {
    let language;
    Object.entries(exports.LANGUAGE_REGEXES).forEach(([lang, regex]) => {
        if (regex.test(str) && !(0, exports.isNumber)(str)) {
            language = lang;
        }
    });
    return language;
};
exports.detectLanguage = detectLanguage;
// Use the two different language detectors to guess a language
const detectLangInfo = (text) => {
    // Use the tinyld language detector to get the detectedLang
    const detectedLangs = (0, tinyld_1.detectAll)(text);
    let detectedLang = detectedLangs[0]?.lang;
    let detectedLangAccuracy = detectedLangs[0]?.accuracy || 0;
    // Use LanguageDetector to get the altLanguage
    const altDetectedLangs = LANGUAGE_DETECTOR.detect(text);
    let altLanguage = altDetectedLangs.length ? altDetectedLangs[0][0] : undefined;
    const altLangAccuracy = altDetectedLangs.length ? altDetectedLangs[0][1] : 0;
    if (altLanguage && altLanguage in language_helper_1.LANGUAGE_CODES) {
        altLanguage = language_helper_1.LANGUAGE_CODES[altLanguage];
    }
    else if (altLanguage) {
        console.warn(`[detectLangInfo()] altLanguage "${altLanguage}" found but not in LANGUAGE_CODES!"`);
    }
    // Ignore Klingon etc.
    if (detectedLang) {
        if (IGNORE_LANGUAGES.includes(detectedLang)) {
            detectedLang = undefined;
            detectedLangAccuracy = 0;
        }
        else if (OVERCONFIDENT_LANGUAGES.includes(detectedLang || exports.NULL)
            && detectedLangAccuracy > exports.VERY_HIGH_LANG_ACCURACY
            && altLanguage
            && altLanguage != detectedLang) {
            console.warn(`"${detectedLang}" is overconfident (${detectedLangAccuracy})! altLanguage="${altLanguage}" (accuracy: ${altLangAccuracy.toPrecision(4)})`);
            // tinyld is overconfident about some languages
            if (detectedLangs.length > 1) {
                detectedLang = detectedLangs[1].lang;
                detectedLangAccuracy = detectedLangs[1].accuracy;
            }
            else {
                detectedLang = undefined;
                detectedLangAccuracy = 0;
            }
        }
    }
    let determinedLang;
    const accuracies = [detectedLangAccuracy, altLangAccuracy];
    const summary = `detectedLang="${detectedLang}" (accuracy: ${detectedLangAccuracy.toPrecision(4)})` +
        `, altDetectedLang="${altLanguage}" (accuracy: ${altLangAccuracy?.toPrecision(4)})`;
    // If both detectors agree on the language and one is MIN_LANG_ACCURACY or both are half MIN_LANG_ACCURACY use that
    if (detectedLang && detectedLang == altLanguage
        && accuracies.some((a) => a > exports.MIN_LANG_ACCURACY) || accuracies.every((a) => a > (exports.MIN_LANG_ACCURACY / 2))) {
        determinedLang = detectedLang;
    }
    else if (detectedLangAccuracy >= exports.VERY_HIGH_LANG_ACCURACY && language_helper_1.FOREIGN_SCRIPTS.includes(detectedLang || exports.NULL)) {
        // console.debug(`"${detectedLang}" is foreign script w/high accuracy, using it as determinedLang for "${text}". ${summary}`);
        determinedLang = detectedLang;
    }
    return {
        accuracies,
        altDetectedLangs,
        altLanguage,
        altLangAccuracy,
        detectedLangs,
        detectedLang,
        detectedLangAccuracy,
        determinedLang,
        summary,
    };
};
exports.detectLangInfo = detectLangInfo;
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
// Remove any emojis
const removeEmojis = (str) => str.replace(EMOJI_REGEX, "");
exports.removeEmojis = removeEmojis;
// Remove https links from string
const removeLinks = (str) => str.replace(LINK_REGEX, "");
exports.removeLinks = removeLinks;
// Remove @username@domain from string
const removeMentions = (str) => str.replace(MENTION_REGEX, "");
exports.removeMentions = removeMentions;
// Remove "#" chars from string
const removeOctothorpe = (str) => str.replace(OCTOTHORPE_REGEX, "");
exports.removeOctothorpe = removeOctothorpe;
// Remove all tags from string
const removeTags = (str) => str.replace(/#\w+/g, "");
exports.removeTags = removeTags;
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
//# sourceMappingURL=string_helpers.js.map