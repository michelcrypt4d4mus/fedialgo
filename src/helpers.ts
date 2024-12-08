import { CountKey, StringNumberDict } from "./types";

export const IMAGE = "image";
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
export const VIDEO = "video";
export const VIDEO_TYPES = ["gifv", VIDEO];
export const MEDIA_TYPES = [IMAGE, ...VIDEO_TYPES];


export function createRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};


// Take the average of an array of numbers, ignoring undefined values
export function average(values: number[]): number | undefined {
    values = values.filter(v => !!v);
    if (values.length == 0) return NaN;
    return values.filter(v => v != undefined).reduce((a, b) => a + b, 0) / values.length;
};


// Return true if uri ends with an image extension like .jpg or .png
export function isImage(uri: string | null | undefined): boolean {
    if (!uri) return false;
    return IMAGE_EXTENSIONS.some(ext => uri.endsWith(ext));
};


// TODO: Standard Object.groupBy() would require some tsconfig setting that i don't know about
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
    return arr.reduce((acc, item) => {
        const group = key(item);
        acc[group] ||= [];
        acc[group].push(item);
        return acc;
    }, {} as Record<string, T[]>);
};


// Apply a transform() function to all keys in a nested object.
export const transformKeys = <T>(data: T, transform: (key: string) => string): T => {
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


// Masto does not support top posts from foreign servers, so we have to do it manually
export const isRecord = (x: unknown): x is Record<string, unknown> => {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
};


export const incrementCount = (
    counts: StringNumberDict,
    key: CountKey | undefined | null
): void => {
    key = key ?? "unknown";
    counts[key] = (counts[key] || 0) + 1;
};
