/*
 * Various helper methods for dealing with collections (arrays, objects, etc.)
 */
import chunk from 'lodash/chunk';

import { compareStr, hashObject, isNull } from "./string_helpers";
import { config } from "../config";
import { isAccessTokenRevokedError } from '../api/api';
import { isNumber, isNumberOrNumberString } from "./math_helper";
import { Logger } from './logger';
import { sleep } from './time_helpers';
import {
    type ApiCacheKey,
    type CountKey,
    type MastodonObjWithID,
    type MinMax,
    type MinMaxID,
    type PromiseFulfilledResult,
    type PromiseRejectedResult,
    type PromisesResults,
    type StringDict,
    type StringNumberDict,
    type Weights,
    type WithCreatedAt,
} from "../types";

const BATCH_MAP = "batchMap()";


export function addDicts(...args: StringNumberDict[]): StringNumberDict {
    return args.reduce((acc, dict) => {
        Object.entries(dict).forEach(([k, v]) => {
            acc[k] = (acc[k] || 0) + v;
        });

        return acc;
    }, {} as StringNumberDict);
};


// Return a new object with only the key/value pairs that have a value greater than minValue
export function atLeastValues(obj: StringNumberDict, minValue: number): StringNumberDict {
    return Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v > minValue));
};


// Take the average of an array of numbers. null and undefined are excluded, not treated like zero.
export function average(values: number[]): number {
    values = values.filter(isNumber);
    if (values.length == 0) return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
};


// Process an array async in batches of batchSize. From https://dev.to/woovi/processing-promises-in-batch-2le6
//    - items: array of items to process
//    - fxn: function to call for each item
//    - logPrefix: optional label for logging
//    - batchSize: number of items to process at once
//    - sleepBetweenMS: optional number of milliseconds to sleep between batches
// If fxn returns anything it returns the results of mapping items with fxn().
export async function batchMap<T>(
    array: T[],
    fxn: (e: T) => Promise<any>,
    options?: {
        batchSize?: number,
        logger?: Logger,
        sleepBetweenMS?: number
    }
): Promise<any[]> {
    let { batchSize, logger, sleepBetweenMS } = (options || {});
    logger = logger ? logger.tempLogger(BATCH_MAP) : new Logger(BATCH_MAP);
    const chunkSize = batchSize || config.scoring.scoringBatchSize;
    const chunks = makeChunks(array, { chunkSize, logger });
    let results: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const newResults = await Promise.all(chunk.map(fxn));
        if (newResults.filter(Boolean).length) results = [...results, ...newResults]; // Only append non-null results

        if (sleepBetweenMS && (i < (chunks.length - 1))) {
            logger.debug(`${(i + 1) * chunkSize} of ${array.length}, sleeping ${sleepBetweenMS}ms`);
            await sleep(sleepBetweenMS);
        }
    };

    return results;
};


// Check if the elements of 'array' are as unique as they should be
export function checkUniqueIDs(array: MastodonObjWithID[], label: ApiCacheKey): void {
    const logPrefix = `[${label}]`;
    const objsByID = groupBy<MastodonObjWithID>(array, (e) => e.id);
    const uniqueIDs = Object.keys(objsByID);

    if (uniqueIDs.length != array.length) {
        console.warn(`${logPrefix} ${array.length} objs only have ${uniqueIDs.length} unique IDs!`, objsByID);
    }
};


// Get minimum and maximum values from an array of objects using the given valueFxn to extract the value
export function computeMinMax<T>(array: T[], valueFxn: (value: T) => number | undefined): MinMax | null {
    if (array.length == 0) return null;

    return array.reduce(
        (minMax: MinMax, obj: T) => {
            const value = valueFxn(obj);

            if (value) {
                if (value < minMax.min) minMax.min = value;
                if (value > minMax.max) minMax.max = value;
            }

            return minMax;
        },
        {min: Number.MAX_VALUE, max: Number.MIN_VALUE} as MinMax
    );
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
            return (isNull(key) && !countNulls) ? counts : incrementCount(counts, key);
        },
        {} as StringNumberDict
    );
};


// Divide the values of dict1 by the values of dict2, returning a new dict.
export function divideDicts(dict1: StringNumberDict, dict2: StringNumberDict): StringNumberDict {
    const result: StringNumberDict = {};
    const logger = new Logger("divideDicts()");

    Object.keys(dict1).forEach((key) => {
        if (dict2[key]) {
            result[key] = dict1[key] / dict2[key];
        } else {
            logger.warn(`divideDicts() - key "${key}" had value "${dict2[key]}", skipping division`);
            result[key] = 0;
        }
    });

    return result;
}


// Basic collection filter but logs the numebr of elements removed
export function filterWithLog<T>(
    array: T[],
    filterFxn: (value: T) => boolean,
    logger: Logger,
    reason: string,    // Describe why things were filtered
    objType?: string,
): T[] {
    const filtered = array.filter(filterFxn);
    logger.logArrayReduction(array, filtered, objType || "object", reason);
    return filtered;
};


// Find the minimum 'id' property in an array of objects that have an 'id' property.
// TODO: Note that this isn't always safe to use - there can be outliers in the data that result in
// the minimum ID in a set of toots being wildly out of step with the rest of the IDs.
// If that happens trying to use the min ID as the maxId param for a fetch will fail (no results).
// This is an unfixable server side problem that we used to work around with this:
//
// static findMinIdForMaxIdParam(toots: Toot[]): string | null {
//     if (toots.length == 0) return null;
//     const idx = Math.min(toots.length - 1, MAX_ID_IDX);
//     return sortByCreatedAt(toots)[idx].id;
// }
export function findMinMaxId(array: MastodonObjWithID[]): MinMaxID | null {
    if (!array?.length) {
        console.warn(`[findMinMaxId()] called with 0 length array:`, array);
        return null;
    }

    const idVals = array.map(e => e.id);
    const isNumberArray = idVals.every(isNumberOrNumberString);

    if (idVals.some((id) => id === null || id === undefined)) {
        console.warn(`[findMinMaxId()] called with null IDs:`, idVals);
        return null;
    }

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

    return {
        min: sortedIDs[0].toString(),
        max: sortedIDs.slice(-1)[0].toString()
    };
};


// Collate the fulfilled and rejected results given by Promise.allSettled() into an easier to handle format
export async function getPromiseResults<T>(promises: Promise<T>[]): Promise<PromisesResults<T>> {
    const results = await Promise.allSettled(promises);

    return {
        fulfilled: (results.filter(r => r.status == "fulfilled") as PromiseFulfilledResult<T>[]).map(r => r.value),
        rejectedReasons: (results.filter(r => r.status == "rejected") as PromiseRejectedResult[]).map(r => r.reason),
    }
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


// Add 1 to the number at counts[key], or set it to 1 if it doesn't exist
export function incrementCount(counts: StringNumberDict, k?: CountKey | null, increment: number = 1): StringNumberDict {
    k = k ?? "unknown";
    counts[k] = (counts[k] || 0) + increment;
    return counts;
};

export function decrementCount(counts: StringNumberDict, k?: CountKey | null, increment: number = 1): StringNumberDict {
    return incrementCount(counts, k, -1 * increment);
};


// Mastodon does not support top posts from foreign servers, so we have to do it manually
function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
};


{/* Mapping enums is annoying. See: https://www.typescriptlang.org/play/?ts=5.0.4#code/KYDwDg9gTgLgBMAdgVwLZwDIENEHNla7ADOAongDYCWxAFnAN4BQccA5EgKoDKbcAvO3K5qdNgBoW7AF60AEjhh9BbALI4AJlihVE4uABUoWDVRhUIiLBQlMAvkyYwAnmGBwwVAMYBrYFAB5MHNLAUYpLwgNYAAuOD9nCAAzOBc3ZMwcfEISYVFaAG4pCiwAI2AKOOw8AiIyShpC+yKmJORELxDEOCJEfywYYCCugAoEuISMtOAM6uy6vMaASjjPX39hi27mVihgGGQobalWSOiJ4GdJVlYS8srMmpz6kUaAbQSAXWu4OyKHJiRRDEeAQYJbYhhEZSAKlABWwE6ADoEsQRnNarkGnQlnAsJCxpcpq4ZikMc9Fji3p8mEskagsGARr1+oNNpYlkUgA */}
// Generate a fxn to check if a string is in an enum.
// From https://stackoverflow.com/questions/72050271/check-if-value-exists-in-string-enum-in-typescript
export function isValueInStringEnum<E extends string>(strEnum: Record<string, E>) {
    const enumValues = new Set(Object.values(strEnum) as string[]);
    return (value: string): value is E => enumValues.has(value);
};


// Create a dict from obj.id => obj
export function keyById<T extends MastodonObjWithID>(array: T[]): Record<string, T> {
    return keyByProperty<T>(array, obj => obj.id);
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


// Split the array into numChunks OR n chunks of size chunkSize
export function makeChunks<T>(
    array: T[],
    options: {
        chunkSize?: number,
        logger?: Logger,
        numChunks?: number
    }
): T[][] {
    let { chunkSize, logger, numChunks } = options;

    if ((numChunks && chunkSize) || (!numChunks && !chunkSize)) {
        throw new Error(`${logger?.logPrefix || 'makeChunks'} requires numChunks OR chunkSize. options=${JSON.stringify(options)}`);
    }

    chunkSize = numChunks ? Math.ceil(array.length / numChunks) : chunkSize;
    return chunk(array, chunkSize);
};


// Sort array by fxn() value & divide into numPercentiles sections
export function makePercentileChunks<T>(
    array: T[],
    fxn: (element: T) => number | undefined,
    numPercentiles: number
): T[][] {
    const sortedArray = array.toSorted((a, b) => (fxn(a) ?? 0) - (fxn(b) ?? 0));
    return makeChunks(sortedArray, {numChunks: numPercentiles});
};


// Simple wrapper around Array.reduce() that returns a StringNumberDict
export function reduceToCounts<T>(
    objs: T[],
    updateCounts: (accumulator: StringNumberDict, obj: T) => void
): StringNumberDict {
    return objs.reduce(
        (counts, obj: T) => {
            updateCounts(counts, obj);
            return counts;
        },
        {} as StringNumberDict
    );
};


// Remove keys whose value is null or are in the keysToRemove array.
export function removeKeys<T extends object, K extends keyof T>(
    obj: T,
    keysToRemove?: K[],
    keysToRemoveIfFalse?: K[]
): Partial<T> {
    const copy = { ...obj };

    Object.keys(copy).forEach((k) => {
        const key = k as K;

        if ((keysToRemove || []).includes(key) || copy[key] === null || copy[key] === undefined) {
            delete copy[key];
        } else if ((keysToRemoveIfFalse || []).includes(key) && copy[key] === false) {
            delete copy[key];
        }
    });

    return copy;
};


// Randomize the order of an array
export function shuffle<T extends (string | number | object)>(array: T[]): T[] {
    const sortRandom = (a: T, b: T) => hashObject(a).localeCompare(hashObject(b));
    return array.toSorted(sortRandom);
};


// Sort the keys of a dict by their values in descending order
export function sortKeysByValue(dict: StringNumberDict): string[] {
    return Object.keys(dict).sort((a, b) => {
        const aVal = dict[a] || 0;
        const bVal = dict[b] || 0;

        if (aVal == bVal) {
            return compareStr(a, b);
        } else {
            return bVal - aVal;
        }
    });
};


// Sort an array of objects by given property (or properties - extra props are used as tiebreakers).
// If ascending is true, sort in ascending order (low to high), otherwise high to low.
export function sortObjsByProps<T>(
    array: T[],
    prop: keyof T | (keyof T)[],
    ascending?: boolean | boolean[],
    ignoreCase?: boolean
): T[] {
    ascending ||= false;
    const props = Array.isArray(prop) ? prop : [prop];
    const ascendings = Array.isArray(ascending) ? ascending : [ascending];
    if (props.length > 2) throw new Error("sortObjsByProps() only supports 2 properties for sorting for now");

    return array.toSorted((a: T, b: T) => {
        let aVal: T[keyof T] | string = a[props[0]];
        let bVal: T[keyof T] | string = b[props[0]];
        let ascending = ascendings[0];

        if (ignoreCase && typeof aVal == "string" && typeof bVal == "string") {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        if (props.length == 1) return 0;

        // Compare second property
        aVal = a[props[1]];
        bVal = b[props[1]];
        ascending = ascendings.length > 1 ? ascendings[1] : ascendings[1];

        if (ignoreCase && typeof aVal == "string" && typeof bVal == "string") {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;

        return 0;
    });
};


// Sort an array of objects by the createdAt property
export function sortObjsByCreatedAt<T extends WithCreatedAt>(array: T[]): T[] {
    return sortObjsByProps<T>(arguments[0], "createdAt");
};


// Return a two element array of arrays, the first of which contains all elements that match
// the condition and the second contains all elements that do not match.
export function split<T>(array: T[], condition: (element: T) => boolean): [T[], T[]] {
    return [
        array.filter((element) => condition(element)),
        array.filter((element) => !condition(element)),
    ];
};


// Subtract a constant from all values in a dict
export function subtractConstant(dict: StringNumberDict, constant: number): StringNumberDict {
    return Object.fromEntries(
        Object.entries(dict).map(([k, v]) => [k, v - constant])
    );
};


// Sum the elements of an array
export function sumArray(arr: (number | null | undefined)[]): number {
    const numArray: number[] = arr.map((x) => (x ?? 0));
    return numArray.reduce((a, b) => a + b, 0);
};


// Sum the values of a dict
export function sumValues(obj: StringNumberDict | Weights): number {
    return sumArray(Object.values(obj));
};


// Turn values into keys and keys into values.
export function swapKeysAndValues<T extends StringDict>(dict: T): StringDict {
    return Object.fromEntries(Object.entries(dict).map(entry => entry.toReversed()))
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


// Find the configured value at configKey and truncate array to that length
export function truncateToConfiguredLength(array: any[], maxRecords: number, logger?: Logger): any[] {
    if (array.length <= maxRecords) return array;
    logger ||= new Logger("truncateToConfiguredLength()");
    const startLen = array.length;
    array = array.slice(0, maxRecords);
    logger.deep(`Truncated array of ${startLen} to ${array.length} (maxRecords=${maxRecords})`);
    return array;
};


// Return a new array with only unique non null values
export const uniquify = (array: (string | undefined)[]): string[] | undefined => {
    if (array.length == 0) return undefined;
    let newArray = array.filter((e) => e != undefined) as string[];
    newArray = [...new Set(newArray)];
    return newArray;
};


// Remove elements of an array if they have duplicate values for the given transform function
export function uniquifyByProp<T>(rows: T[], transform: (obj: T) => string, logPrefix?: string): T[] {
    const logger = new Logger(logPrefix || 'collections_helpers', "uniquifyByProp()");
    const newRows = [...new Map(rows.map((element) => [transform(element), element])).values()];

    if (logPrefix && newRows.length < rows.length) {
        logger.trace(`Removed ${rows.length - newRows.length} duplicate rows`);
    }

    return newRows;
};


// [ 'a', 'b', 'c' ], [ 1, 2, 3 ] -> { a: 1, b: 2, c: 3 }
export function zipArrays<T>(array1: string[], array2: T[]): Record<string, T> {
    return Object.fromEntries(array1.map((e, i) => [e, array2[i]]));
};


// Run a list of promises in parallel and return a dict of the results keyed by the input
// Raises error on isAccessTokenRevokedError(), otherwise just logs a warning and moves on
export async function zipPromises<T>(
    args: string[],
    promiser: (s: string) => Promise<T>,
    logger?: Logger
): Promise<Record<string, T>> {
    const allResults = zipArrays(args, await Promise.allSettled(args.map(promiser)));
    logger ||= new Logger(`zipPromises`);

    return Object.entries(allResults).reduce(
        (results, [arg, result]) => {
            if (result.status == "fulfilled") {
                results[arg] = result.value;
            } else {
                if (isAccessTokenRevokedError(result.reason)) {
                    throw result.reason;
                } else {
                    logger!.warn(`Failure on argument "${arg}":`, result.reason)
                }
            }

            return results;
        },
        {} as Record<string, T>
    );
};
