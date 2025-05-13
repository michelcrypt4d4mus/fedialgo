/*
 * Helpers for dealing with strings.
 */
import md5 from "blueimp-md5";
import { decode } from 'html-entities';
import { mastodon } from 'masto';

import { LANGUAGE_CODES } from "./language_helper";
import { MediaCategory } from '../types';

// Number constants
export const DEFAULT_FONT_SIZE = 15;
export const KILOBYTE = 1024;
export const MEGABYTE = KILOBYTE * 1024;

// String constants
export const FEDIALGO = 'FediAlgo';
export const NULL = "<<NULL>>";
export const TELEMETRY = 'TELEMETRY';

const EMOJI_REGEX = /\p{Emoji}/gu;
const LINK_REGEX = /https?:\/\/([-\w.]+)\S*/g;
const MENTION_REGEX = /@[\w.]+(@[-\w.]+)?/g;
const OCTOTHORPE_REGEX = /#/gi;

// Multimedia types
export const GIFV = "gifv";
export const IMAGE_EXTENSIONS = ["gif", "jpg", "jpeg", "png", "webp"];
export const VIDEO_EXTENSIONS = ["mp4"];

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

// International locales, see: https://gist.github.com/wpsmith/7604842
export const GREEK_LOCALE = `${LANGUAGE_CODES.greek}-GR`;
export const JAPANESE_LOCALE = `${LANGUAGE_CODES.japanese}-JP`;
export const KOREAN_LOCALE = `${LANGUAGE_CODES.korean}-KR`;
export const RUSSIAN_LOCALE = `${LANGUAGE_CODES.russian}-${LANGUAGE_CODES.russian.toUpperCase()}`;

// See https://www.regular-expressions.info/unicode.html for unicode regex scripts
export const LANGUAGE_REGEXES = {
    [LANGUAGE_CODES.arabic]: new RegExp(`^[\\p{Script=Arabic}\\d]+$`, 'v'),
    [LANGUAGE_CODES.greek]: new RegExp(`^[\\p{Script=Greek}\\d]+$`, 'v'),    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets
    [LANGUAGE_CODES.japanese]: new RegExp(`^[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]{2,}[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\da-z]*$`, 'v'), //    /^[一ー-龯ぁ-んァ-ン]{2,}/,         // https://gist.github.com/terrancesnyder/1345094
    [LANGUAGE_CODES.korean]: new RegExp(`^[\\p{Script=Hangul}\\d]+$`, 'v'),  // [KOREAN_LANGUAGE]: /^[가-힣]{2,}/,
    [LANGUAGE_CODES.russian]: new RegExp(`^[\\p{Script=Cyrillic}\\d]+$`, 'v'),
};

// [Bracketed]
export const bracketed = (str: string): string => str.startsWith('[') ? str : `[${str}]`;
// Doublequotes
export const quoted = (str: string | null): string => str == null ? NULL : `"${str}"`;
// Returns true if n is a number or a string that can be converted to a number
export const isNumber = (n: string | number): boolean => (typeof n == "number") || /^[\d.]+$/.test(n);
// for use with sort()
export const compareStr = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());


// Return a string representation of a number of bytes
export const byteString = (numBytes: number): string => {
    if (numBytes < KILOBYTE) return `${numBytes} bytes`;
    if (numBytes < MEGABYTE) return `${(numBytes / KILOBYTE).toFixed(1)} kilobytes`;
    return `${(numBytes / MEGABYTE).toFixed(2)} MEGABYTES`;
};


// Count occurrences of substr within str
export function countInstances(str: string, substr: string): number {
    return Math.max(str.split(substr).length - 1, 0);
};


// Create a random string of the given length
export function createRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};


// Returns the language code of the matched regex (if any)
export const detectLanguage = (str: string): string | undefined => {
    let language: string | undefined;

    Object.entries(LANGUAGE_REGEXES).forEach(([lang, regex]) => {
        if (regex.test(str) && !isNumber(str)) {
            language = lang;
        }
    });

    return language;
};


// "http://www.mast.ai/foobar" => "mast.ai"
export function extractDomain(url: string): string {
    url ??= "";

    if (countInstances(url, "/") < 2) {
        console.warn(`extractDomain() found no frontslashes in: ${url}`);
        return "";
    }

    const domain = url.split("/")[2].toLowerCase();
    return domain.startsWith("www.") ? domain.substring(4) : domain;
};


// Take the MD5 hash of a jacascript object / number / string
export function hashObject(obj: object | number | string): string {
    return md5(JSON.stringify(obj));
};


// Remove HTML tags and newlines from a string; decode HTML entities
export function htmlToText(html: string): string {
    let txt = html.replace(/<\/p>/gi, "\n").trim();  // Turn closed <p> tags into newlines
    txt = txt.replace(/<[^>]+>/g, "");               // Strip HTML tags
    txt = txt.replace(/\n/g, " ");                   // Strip newlines
    txt = txt.replace(/\s+/g, " ");                  // Collapse multiple spaces
    return decode(txt).trim();                       // Decode HTML entities lik '&amp;' etc.
};


// Return true if uri ends with an image extension like .jpg or .png
export function isImage(uri: string | null | undefined): boolean {
    if (!uri) return false;
    return IMAGE_EXTENSIONS.some(ext => uri.split("?")[0].endsWith(ext));
};


// Return true if uri ends with a video extension like .mp4 or .gifv
export function isVideo(uri: string | null | undefined): boolean {
    if (!uri) return false;
    return VIDEO_EXTENSIONS.some(ext => uri.split("?")[0].endsWith(ext));
};


// Remove any emojis
export const removeEmojis = (str: string) => str.replace(EMOJI_REGEX, "");
// Remove https links from string
export const removeLinks = (str: string) => str.replace(LINK_REGEX, "");
// Remove @username@domain from string
export const removeMentions = (str: string) => str.replace(MENTION_REGEX, "");
// Remove "#" chars from string
export const removeOctothorpe = (str: string) => str.replace(OCTOTHORPE_REGEX, "");
// Remove all tags from string
export const removeTags = (str: string) => str.replace(/#\w+/g, "");


// Replace custom emoji shortcodes like :smile: with <img> tags
export function replaceEmojiShortcodesWithImageTags(
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


// Replace https links with [link to DOMAIN], e.g.
// "Check my link: https://mast.ai/foobar" => "Check my link: [link to mast.ai]"
export function replaceHttpsLinks(input: string): string {
    return input.replace(LINK_REGEX, (_, domain) => `[${domain}]`);
};


// Number to string (could also be done with Math.floor(num).toLocaleString())
export const toLocaleInt = (num: number | null): string => {
    if (num == null) return NULL;
    return num.toLocaleString(undefined, {maximumFractionDigits: 0});
};
