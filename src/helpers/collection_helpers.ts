/*
 * Various helper methods for dealing with collections (arrays, objects, etc.)
 */
import md5 from "blueimp-md5";

import { CountKey, StringNumberDict, Weights } from "../types";


// Take the average of an array of numbers, ignoring undefined values
export function average(values: number[]): number {
    values = values.filter(v => !!v);
    if (values.length == 0) return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
};


// TODO: Standard library Object.groupBy() requires some tsconfig setting that i don't understand
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


export function sumValues(obj: StringNumberDict | Weights): number {
    return Object.values(obj).reduce((a, b) => a + b, 0);
};


// Mastodon does not support top posts from foreign servers, so we have to do it manually
function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
};


// Randomize the order of an array
export function shuffle<T>(array: T[]): T[] {
    const sortRandom = (a: T, b: T) => md5(JSON.stringify(a)).localeCompare(JSON.stringify(b));
    return array.toSorted(sortRandom);
};
