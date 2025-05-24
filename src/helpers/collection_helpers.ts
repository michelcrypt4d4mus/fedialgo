/*
 * Various helper methods for dealing with collections (arrays, objects, etc.)
 */
import { bracketed, compareStr, hashObject, isNumber } from "./string_helpers";
import { config } from "../config";
import { CountKey, MastodonObjWithID, MinMax, MinMaxID, CacheKey, StringNumberDict, Weights } from "../types";
import { traceLog } from "./log_helpers";


// Return a new object with only the key/value pairs that have a value greater than minValue
export function atLeastValues(obj: StringNumberDict, minValue: number): StringNumberDict {
    return Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v > minValue));
};


// Take the average of an array of numbers. null and undefined are excluded, not treated like zero.
export function average(values: number[]): number {
    values = values.filter(v => v || v == 0);
    if (values.length == 0) return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
};


// Process a list of promises in batches of batchSize. Returns list of results mapped by mapFxn.
// From https://dev.to/woovi/processing-promises-in-batch-2le6
//    - items: array of items to process
//    - mapFxn: function to call for each item
//    - label: optional label for logging
//    - batchSize: number of items to process at once
//    - sleepBetweenMS: optional number of milliseconds to sleep between batches
export async function batchMap<T>(
    items: Array<T>,
    mapFxn: (item: T) => Promise<any>,
    label?: string,
    batchSize?: number,
    sleepBetweenMS?: number
): Promise<any[]> {
    batchSize ||= config.scoring.scoringBatchSize;
    let results: any[] = [];
    let logPrefix = `[${label || 'batchMap'}]`;

    for (let start = 0; start < items.length; start += batchSize) {
        const end = start + batchSize > items.length ? items.length : start + batchSize;
        const slicedResults = await Promise.all(items.slice(start, end).map(mapFxn));
        results = [...results, ...slicedResults]

        if (sleepBetweenMS && (items.length > end)) {
            console.debug(`${logPrefix} batchMap() ${end} of ${items.length}, sleeping for ${sleepBetweenMS}ms...`);
            await new Promise((resolve) => setTimeout(resolve, sleepBetweenMS));
        }
    }

    return results;
};


// Check if the elements of 'array' are as unique as they should be
export function checkUniqueIDs(array: MastodonObjWithID[], label: CacheKey): void {
    const logPrefix = `[${label}]`;
    // traceLog(`${logPrefix} Checking ${array.length} ${label} IDs for uniqueness...`);
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
            if (key == null && !countNulls) return counts;
            return incrementCount(counts, key);
        },
        {} as StringNumberDict
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
        console.debug(`${bracketed(logPrefix)} Removed ${numRemoved} ${reason} ${objType}s leaving ${filtered.length}`);
    }

    return filtered;
};


// Find the minimum id in an array of objects using the given idFxn to extract the id
// TODO: Note that this isn't always safe to use - there can be outliers in the data that result in
// the minimum ID in a set of toots being wildly out of step with the rest of the IDs.
// If that happens trying to use the min ID as the maxId param for a fetch will fail (no results).
// This is an unfixable server side problem that we work around in TheAlgorithm.maybeFetchMoreData()
export function findMinMaxId(array: MastodonObjWithID[]): MinMaxID | undefined {
    if (!array.length) {
        console.warn(`[findMinMaxId()] called with 0 length array:`, array);
        return undefined;
    }

    const idVals = array.map(e => e.id);
    const isNumberArray = idVals.every(isNumber);

    if (idVals.some((id) => id === null || id === undefined)) {
        console.warn(`[findMinMaxId()] called with null IDs:`, idVals);
        return undefined;
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


// Divide array into numPercentiles sections, returns array of arrays of type T objects
export function percentileSegments<T>(
    array: T[],
    fxn: (element: T) => number | undefined,
    numPercentiles: number
): T[][] {
    array = array.toSorted((a, b) => (fxn(a) ?? 0) - (fxn(b) ?? 0));
    let batchSize = array.length / numPercentiles;
    if (batchSize % 1 != 0) batchSize += 1;
    batchSize = Math.floor(batchSize);
    const percentileSegments: T[][] = [];

    for (let start = 0; start < array.length; start += batchSize) {
        const end = start + batchSize > array.length ? array.length : start + batchSize;
        const section = array.slice(start, end);
        percentileSegments.push(section);
    }

    return percentileSegments;
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
// If ascending is true, sort in ascending order (low to high)
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


// Return a two element array of arrays, the first of which contains all elements that match
// the condition and the second contains all elements that do not match.
export function split<T>(array: T[], condition: (element: T) => boolean): [T[], T[]] {
    return [
        array.filter((element) => condition(element)),
        array.filter((element) => !condition(element)),
    ];
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
export function truncateToConfiguredLength(array: any[], maxRecords: number, label?: string): any[] {
    if (array.length <= maxRecords) return array;
    const logPfx = bracketed(label || "truncateToConfiguredLength()");
    const startLen = array.length;
    array = array.slice(0, maxRecords);
    console.log(`${logPfx} Truncated array of ${startLen} to ${array.length} to ${maxRecords}`);
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
export function uniquifyByProp<T>(array: T[], transform: (value: T) => string): T[] {
    return [...new Map(array.map((element) => [transform(element), element])).values()];
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
