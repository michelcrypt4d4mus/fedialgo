/*
 * Helpers for dealing with strings.
 */
const escape = require('regexp.escape');
import md5 from "blueimp-md5";
import { decode } from 'html-entities';
import { mastodon } from 'masto';

import { MediaCategory } from '../enums';

// Number constants
export const DEFAULT_FONT_SIZE = 15;
export const KILOBYTE = 1024;
export const MEGABYTE = KILOBYTE * 1024;

// String constants
export const FEDIALGO = 'FediAlgo';
export const NULL = "<<NULL>>";
export const SET_LOADING_STATUS = "SET_LOADING_STATUS";
export const TELEMETRY = 'TELEMETRY';

// Regexes
export const NUMBER_REGEX = /^[\d.]+$/;
const ACCOUNT_MENTION_REGEX = /@[\w.]+(@[-\w.]+)?/g;
const EMOJI_REGEX = /\p{Emoji}/gu;
const HAHSTAG_REGEX = /#\w+/g;
const LINK_REGEX = /https?:\/\/([-\w.]+)\S*/g;
const WHITESPACE_REGEX = /\s+/g;

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

// Check if it's a string
export const isString = (s: unknown) => typeof s === 'string'; // || s instanceof String; // TODO: wtf is String about?
// Check if it's empty (all whitespace or null or undefined)
export const isEmptyStr = (s: string | null | undefined) => s === null || s === undefined || s.trim() === '';

// Alphabetize an array of strings
export const alphabetize = (arr: string[]) => arr.sort(compareStr);
// for use with sort()
export const compareStr = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());

// "string" => "@string"
export const at = (str: string): string => str.startsWith('@') ? str : `@${str}`;
// "foo" => "<foo>"
export const arrowed = (str: string): string => str.startsWith('<') ? str : `<${str}>`;
// [Bracketed]
export const bracketed = (str: string): string => str.startsWith('[') ? str : `[${str}]`;
// Prefix a string with [Brackets] and a space
export const prefixed = (prefix: string, msg: string) => `${bracketed(prefix)} ${msg}`;
// Doublequotes
export const quoted = (str: string | null): string => str == null ? NULL : `"${str}"`;

// Collapse whitespace in a string
export const collapseWhitespace = (str: string) => str.replace(WHITESPACE_REGEX, " ").replace(/\s,/g,  ",").trim();
// Remove diacritics ("ó" => "o", "é" => "e", etc.)
export const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Remove any emojis
export const removeEmojis = (str: string) => str.replace(EMOJI_REGEX, " ");
// Remove https links from string
export const removeLinks = (str: string) => str.replace(LINK_REGEX, " ");
// Remove @username@domain from string
export const removeMentions = (str: string) => str.replace(ACCOUNT_MENTION_REGEX, " ");
// Remove all tags from string
export const removeTags = (str: string) => str.replace(HAHSTAG_REGEX, " ");


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
    txt = txt.replace(/<br\s*\/?>/gi, "\n");         // Turn <br> tags into newlines
    txt = txt.replace(/<[^>]+>/g, "");               // Strip HTML tags
    txt = txt.replace(/\n/g, " ");                   // Strip newlines
    return collapseWhitespace(decode(txt)).trim();   // Decode HTML entities lik '&amp;' etc. whitespace etc.
};


// Break up an HTML string into paragraphs
export function htmlToParagraphs(html: string): string[] {
    if (!(html.includes("</p>") || html.includes("</P>"))) return [html];
    return html.split(/<\/p>/i).filter(p => p.length).map(p => `${p}</p>`);
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


// 1st, 2nd, 3rd, 4th, etc.
export const ordinalSuffix = (n: number): string => {
    if (n > 3 && n < 21) return "th";

    switch (n % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
};


export const suffixedInt = (n: number): string => {
    return `${n}${ordinalSuffix(n)}`;
};


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


// Create a regex that matches a whole word, case-insensitive
export const wordRegex = (pattern: string): RegExp => {
    return new RegExp(`\\b${escape(pattern.trim())}\\b`, 'i');
};
