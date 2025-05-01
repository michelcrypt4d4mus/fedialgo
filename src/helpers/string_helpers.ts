/*
 * Helpers for dealing with strings.
 */
import { decode } from 'html-entities';
import { mastodon } from 'masto';

import { MediaCategory } from '../types';
import { nowString } from './time_helpers';

export const DEFAULT_FONT_SIZE = 15;
export const NULL = "<<NULL>>";
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


// Replace https links with [link to DOMAIN], e.g.
// "Check my link: https://mast.ai/foobar" => "Check my link: [link to mast.ai]"
export function replaceHttpsLinks(input: string): string {
    return input.replace(/https:\/\/([\w.-]+)\S*/g, (_, domain) => `[${domain}]`);
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


// Return true if uri ends with an image extension like .jpg or .png
export function isVideo(uri: string | null | undefined): boolean {
    if (!uri) return false;
    return VIDEO_EXTENSIONS.some(ext => uri.split("?")[0].endsWith(ext));
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


// Count occurrences of substr within str
export function countInstances(str: string, substr: string): number {
    return Math.max(str.split(substr).length - 1, 0);
};


export function createRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};


// Simple log helper that only fires if numRemoved > 0
export function logTootRemoval(prefix: string, tootType: string, numRemoved: number, numTotal: number): void {
    if (numRemoved == 0) return;
    console.log(`[${prefix}] Removed ${numRemoved} ${tootType} toots leaving ${numTotal} toots`);
};


// Log an error message and throw an Error
export function logAndThrowError(message: string, obj?: any): never {
    if (obj) {
        console.error(message, obj);
        message += `\n${JSON.stringify(obj, null, 4)}`;
    } else {
        console.error(message);
    }

    throw new Error(message);
};


// Doublequotes
export const quote = (text: string | null): string => text == null ? NULL : `"${text}"`;


// Number to string (could also be done with Math.floor(num).toLocaleString())
export const toFixedLocale = (num: number | null): string => {
    if (num == null) return NULL;
    return num.toLocaleString(undefined, {maximumFractionDigits: 0});
};


// console.info() with a timestamp
export const logInfo = (logPrefix: string, message: string, ...args: any[]): void => {
    console.info(`[[${nowString()} ${logPrefix}]] ${message}`, ...args);
};
