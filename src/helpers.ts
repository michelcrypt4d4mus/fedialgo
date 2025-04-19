/*
 * Various small helper methods.
 */
import { decode } from 'html-entities';
import { mastodon } from "masto";

import { CountKey, StringNumberDict } from "./types";

export const AUDIO = "audio";
export const IMAGE = "image";
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
export const VIDEO = "video";
export const VIDEO_TYPES = [VIDEO, "gifv"] as mastodon.v1.MediaAttachmentType[];
export const VIDEO_EXTENSIONS = ["mp4"];
export const MEDIA_TYPES = [AUDIO, IMAGE, ...VIDEO_TYPES];
export const DEFAULT_FONT_SIZE = 15;
const EARLIEST_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");


// "http://mast.ai/foobar" => "mast.ai"
export const extractDomain = (url: string): string => url?.split("/")[2];


// Replace https links with [link to DOMAIN]
export function replaceHttpsLinks(input: string): string {
    return input.replace(/https:\/\/([\w.-]+)\S*/g, (_, domain) => `[${domain}]`);
};


// Remove HTML tags and newlines from a string
export function htmlToText(html: string): string {
    let txt = html.replace(/<\/p>/gi, "\n").trim();  // Turn closed <p> tags into newlines
    txt = txt.replace(/<[^>]+>/g, "");               // Strip HTML tags
    txt = txt.replace(/\n/g, " ");                   // Strip newlines
    txt = txt.replace(/\s+/g, " ");                  // Collapse multiple spaces
    return decode(txt).trim();                       // Decode HTML entities lik '&amp;' etc.
};


function removeHttpsLinks(input: string): string {
    return input.replace(/https:\/\/\S+/g, '');
}

// Take the average of an array of numbers, ignoring undefined values
export function average(values: number[]): number {
    values = values.filter(v => !!v);
    if (values.length == 0) return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
};


// Return true if uri ends with an image extension like .jpg or .png
export function isImage(uri: string | null | undefined): boolean {
    if (!uri) return false;
    return IMAGE_EXTENSIONS.some(ext => uri.endsWith(ext));
};


// Return true if uri ends with an image extension like .jpg or .png
export function isVideo(uri: string | null | undefined): boolean {
    if (!uri) return false;
    return VIDEO_EXTENSIONS.some(ext => uri.endsWith(ext));
};



// TODO: Standard Object.groupBy() would require some tsconfig setting that i don't know about
export function groupBy<T>(array: T[], makeKey: (item: T) => string): Record<string, T[]> {
    return array.reduce(
        (grouped, item) => {
            const group = makeKey(item);
            grouped[group] ||= [];
            grouped[group].push(item);
            return grouped;
        },
        {} as Record<string, T[]>
    );
};


// Apply a transform() function to all keys in a nested object.
export function transformKeys<T>(data: T, transform: (key: string) => string): T {
    if (Array.isArray(data)) {
        return data.map((value) => transformKeys<T>(value, transform)) as T;
    }

    if (isRecord(data)) {
        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
                transform(key),
                transformKeys(value, transform),
            ])
        ) as T;
    }

    return data as T;
};


// Add 1 to the number at counts[key], or set it to 1 if it doesn't exist
export function incrementCount(
    counts: StringNumberDict,
    key?: CountKey | null,
    increment: number = 1
): StringNumberDict {
    key = key ?? "unknown";
    counts[key] = (counts[key] || 0) + increment;
    return counts;
};


// Return a dict keyed by the result of getKey() with the number of times that result appears in 'items'
export function countValues<T>(
    items: T[],
    getKey: (item: T) => string | null | undefined = (item) => item as string,
    countNulls?: boolean
): StringNumberDict {
    return items.reduce(
        (counts, item) => {
            const key = getKey(item);
            if (key == null && !countNulls) return counts;
            return incrementCount(counts, key);
        },
        {} as StringNumberDict
    );
};


// [ 'a', 'b', 'c' ], [ 1, 2, 3 ] -> { a: 1, b: 2, c: 3 }
export function zipArrays<T>(array1: string[], array2: T[]): Record<string, T> {
    return Object.fromEntries(array1.map((e, i) => [e, array2[i]]));
};


// Run a list of promises in parallel and return a dict of the results keyed by the input
export async function zipPromises<T>(
    args: string[],
    promiser: (s: string) => Promise<T>
): Promise<Record<string, T>> {
    return zipArrays(args, await Promise.all(args.map(promiser)));
};


// Sort the keys of a dict by their values in descending order
export function sortKeysByValue(dict: StringNumberDict): string[] {
    return Object.keys(dict).sort((a, b) => dict[b] - dict[a]);
};


// Return a new object with only the key/value pairs that have a value greater than minValue
export function atLeastValues(obj: StringNumberDict, minValue: number): StringNumberDict {
    return Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v > minValue));
};


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


export function createRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};


// Mastodon does not support top posts from foreign servers, so we have to do it manually
function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
};
