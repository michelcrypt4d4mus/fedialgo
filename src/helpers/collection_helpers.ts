/*
 * Various helper methods for dealing with collections (arrays, objects, etc.)
 */
import md5 from "blueimp-md5";

import Storage from "../Storage";
import { ageInSeconds } from "./time_helpers";
import { Config } from "../config";
import { CountKey, MastodonID, StorageKey, StringNumberDict, Weights } from "../types";
import { isNumber } from "./string_helpers";


// Take the average of an array of numbers. null and undefined are excluded, not treated like zero.
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


// Sum the values of a dict
export function sumValues(obj: StringNumberDict | Weights): number {
    return sumArray(Object.values(obj));
};


// Sum the elements of an array
export function sumArray(arr: (number | null | undefined)[]): number {
    const numArray: number[] = arr.map((x) => (x ?? 0));
    return numArray.reduce((a, b) => a + b, 0);
}


// Mastodon does not support top posts from foreign servers, so we have to do it manually
function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
};


// Randomize the order of an array
export function shuffle<T>(array: T[]): T[] {
    const sortRandom = (a: T, b: T) => md5(JSON.stringify(a)).localeCompare(JSON.stringify(b));
    return array.toSorted(sortRandom);
};


// Remove elements of an array if they have duplicate values for the given transform function
export function uniquifyByProp<T>(array: T[], transform: (value: T) => string): T[] {
    return [...new Map(array.map((element) => [transform(element), element])).values()];
};


// Process a list of promises in batches of batchSize. label is for optional logging.
// From https://dev.to/woovi/processing-promises-in-batch-2le6
export async function batchPromises<T>(
    items: Array<T>,
    fn: (item: T) => Promise<any>,
    label?: string,
    batchSize?: number,
): Promise<any[]> {
    batchSize ||= Storage.getConfig().scoringBatchSize;
    const startTime = new Date();
    let results: any[] = [];

    for (let start = 0; start < items.length; start += batchSize) {
        const end = start + batchSize > items.length ? items.length : start + batchSize;
        const slicedResults = await Promise.all(items.slice(start, end).map(fn));
        results = [...results, ...slicedResults]

        // if (label) {
        //     console.debug(`[${label}] Processed ${end} batch promises in ${ageInSeconds(startTime)} seconds...`);
        // }
    }

    return results;
};


// Build a dictionary from the result of keyFxn() for each object in the array
export function keyByProperty<T>(array: T[], keyFxn: (value: T) => string): Record<string, T> {
    return array.reduce(
        (keyedDict, obj) => {
            keyedDict[keyFxn(obj)] = obj;
            return keyedDict;
        },
        {} as Record<string, T>
    );
};


// Basic collection filter but logs the numebr of elements removed
export function filterWithLog<T>(
    array: T[],
    filterFxn: (value: T) => boolean,
    logPrefix: string,
    reason: string,    // Describe why things were filtered
    objType?: string,
): T[] {
    objType ||= 'obj'
    const startingLength = array.length;
    const filtered = array.filter(filterFxn);
    const numRemoved = startingLength - filtered.length;

    if (numRemoved > 0) {
        console.debug(`[${logPrefix}] Removed ${numRemoved} ${reason} ${objType}s leaving ${filtered.length}`);
    }

    return filtered;
};


// Find the minimum id in an array of objects using the given idFxn to extract the id
export function findMinId(array: MastodonID[]): string | undefined{
    if (array.length == 0) return undefined;
    const idVals = array.map(e => e.id);
    const isNumberArray = idVals.every(isNumber);

    // IDs are presented as strings but are usually numbers
    const sortedIDs = idVals.toSorted((a, b) => {
        a = a.toString();
        b = b.toString();

        if (isNumberArray) {
            return parseFloat(a) - parseFloat(b);
        } else {
            return a > b ? 1 : -1;
        }
    });

    return sortedIDs[0].toString();
};


// Check if the elements of 'array' are as unique as they should be
export function checkUniqueIDs(array: MastodonID[], label: StorageKey): void {
    const logPrefix = `[${label}]`;
    console.debug(`${logPrefix} Checking ${array.length} ${label} IDs for uniqueness...`);
    const objsByID = groupBy<MastodonID>(array, (e) => e.id);
    const uniqueIDs = Object.keys(objsByID);

    if (uniqueIDs.length != array.length) {
        console.warn(`${logPrefix} ${array.length} objs only have ${uniqueIDs.length} unique IDs!`, objsByID);
    }
};


// Sort an array of objects by given property (or properties - extra props are used as tiebreakers).
// If ascending is true, sort in ascending order.
export function sortObjsByProps<T>(array: T[], prop: keyof T | (keyof T)[], ascending: boolean = true): T[] {
    const props = Array.isArray(prop) ? prop : [prop];
    if (props.length > 2) throw new Error("sortObjsByProps() only supports 2 properties for sorting for now");

    return array.toSorted((a: T, b: T) => {
        let aVal = a[props[0]];
        let bVal = b[props[0]];

        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        if (props.length == 1) return 0;

        // Compare second propert
        aVal = a[props[1]];
        bVal = b[props[2]];
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;

        return 0;
    });
};


// Find the configured value at configKey and truncate array to that length
export function truncateToConfiguredLength(array: any[], key: keyof Config, label?: string): any[] {
    const logPfx = label ? `[${label}] ` : "";
    const configValue = Storage.getConfig()[key] as number;

    if (!configValue) {
        console.error(`${logPfx}No configured value for ${key}! Not truncating.`);
        return array;
    } else if (array.length <= configValue) {
        return array;
    }

    const startLen = array.length;
    array = array.slice(0, configValue);
    console.log(`${logPfx}Truncated array of ${startLen} to ${array.length} to ${key}: ${configValue}`);
    return array;
};
