import { Logger } from './logger';
import { type CountKey, type MastodonObjWithID, type MinMax, type MinMaxID, type StringDict, type StringNumberDict, type Weights, type WithCreatedAt } from "../types";
type PromisesResults<T> = {
    fulfilled: T[];
    rejectedReasons: any[];
};
/**
 * Adds up an arbitrary number of StringNumberDicts, returning a new dict.
 * @param {...StringNumberDict[]} dicts - Dictionaries to sum.
 * @returns {StringNumberDict} The summed dictionary.
 */
export declare function addDicts(...dicts: StringNumberDict[]): StringNumberDict;
/**
 * Returns a new object with only the key/value pairs that have a value greater than minValue.
 * @param {StringNumberDict} obj - The input dictionary.
 * @param {number} minValue - The minimum value to include.
 * @returns {StringNumberDict} The filtered dictionary.
 */
export declare function atLeastValues(obj: StringNumberDict, minValue: number): StringNumberDict;
/**
 * Returns an array containing the value if defined, otherwise an empty array.
 * @template T
 * @param {T | undefined | null} value - The value to wrap.
 * @returns {[T] | []} The optional array.
 */
export declare function asOptionalArray<T>(value: T | undefined | null): [T] | [];
/**
 * Calculates the average of an array of numbers, ignoring null/undefined completely.
 * @param {number[]} values - The array of numbers.
 * @returns {number} The average, or NaN if the array is empty.
 */
export declare function average(values: number[]): number;
/**
 * Processes an array asynchronously in batches.
 * @template T
 * @param {T[]} array - The array to process.
 * @param {(e: T) => Promise<any>} fxn - The async function to apply.
 * @param {object} [options] - Batch options.
 * @param {number} [options.batchSize] - Batch size.
 * @param {Logger} [options.logger] - Logger instance.
 * @param {number} [options.sleepBetweenMS] - Sleep between batches in ms.
 * @returns {Promise<any[]>} The results of mapping items with fxn().
 */
export declare function batchMap<T>(array: T[], fxn: (e: T) => Promise<any>, options?: {
    batchSize?: number;
    logger?: Logger;
    sleepBetweenMS?: number;
}): Promise<any[]>;
/**
 * Checks if the elements of an array have unique IDs and logs a warning if not.
 * @param {MastodonObjWithID[]} array - Array of objects with IDs.
 * @param {ApiCacheKey} label - Label for logging.
 */
export declare function checkUniqueIDs(array: MastodonObjWithID[], logger: Logger): void;
/**
 * Computes the minimum and maximum values from an array using a value function.
 * @template T
 * @param {T[]} array - The array to process.
 * @param {(value: T) => number | undefined} valueFxn - Function to extract value.
 * @returns {MinMax | null} The min and max values, or null if array is empty.
 */
export declare function computeMinMax<T>(array: T[], valueFxn: (value: T) => number | undefined): MinMax | null;
/**
 * Returns a dictionary keyed by the result of getKey() with the count of each key.
 * @template T
 * @param {T[]} items - The items to count.
 * @param {(item: T) => string | null | undefined} [getKey] - Function to get key.
 * @param {boolean} [countNulls] - Whether to count null keys.
 * @returns {StringNumberDict} The counts dictionary.
 */
export declare function countValues<T>(items: T[], getKey?: (item: T) => string | null | undefined, countNulls?: boolean): StringNumberDict;
/**
 * Divides the values of dict1 by the values of dict2, returning a new dict.
 * @param {StringNumberDict} dict1 - Numerator dictionary.
 * @param {StringNumberDict} dict2 - Denominator dictionary.
 * @returns {StringNumberDict} The result dictionary.
 */
export declare function divideDicts(dict1: StringNumberDict, dict2: StringNumberDict): StringNumberDict;
/**
 * Filters an array and logs the number of elements removed.
 * @template T
 * @param {T[]} array - The array to filter.
 * @param {(value: T) => boolean} filterFxn - The filter function.
 * @param {Logger} logger - Logger instance.
 * @param {string} reason - Reason for filtering.
 * @param {string} [objType] - Object type for logging.
 * @returns {T[]} The filtered array.
 */
export declare function filterWithLog<T>(array: T[], filterFxn: (value: T) => boolean, logger: Logger, reason: string, // Describe why things were filtered
objType?: string): T[];
/**
 * Finds the minimum and maximum 'id' property in an array of objects that have an 'id' property.
 * Find the minimum 'id' property in an array of objects that have an 'id' property.
 * TODO: Note that this isn't always safe to use - there can be outliers in the data that result in
 * the minimum ID in a set of toots being wildly out of step with the rest of the IDs.
 * If that happens trying to use the min ID as the maxId param for a fetch will fail (no results).
 * This is an unfixable server side problem that we used to work around with this:
 *
 * static findMinIdForMaxIdParam(toots: Toot[]): string | null {
 *     if (toots.length == 0) return null;
 *     const idx = Math.min(toots.length - 1, MAX_ID_IDX);
 *     return sortByCreatedAt(toots)[idx].id;
 * }
 * @param {MastodonObjWithID[]} array - Array of objects with IDs.
 * @returns {MinMaxID | null} The min and max IDs, or null if invalid.
 */
export declare function findMinMaxId(array: MastodonObjWithID[]): MinMaxID | null;
/**
 * Collates the fulfilled and rejected results from Promise.allSettled() into an easier to handle format.
 * @template T
 * @param {Promise<T>[]} promises - Array of promises.
 * @returns {Promise<PromisesResults<T>>} The results object.
 */
export declare function getPromiseResults<T>(promises: Promise<T>[]): Promise<PromisesResults<T>>;
/**
 * Groups an array by the result of makeKey().
 * TODO: Standard library Object.groupBy() requires some tsconfig setting that i don't understand
 * @template T
 * @param {T[]} array - The array to group.
 * @param {(item: T) => string} makeKey - Function to get group key.
 * @returns {Record<string, T[]>} The grouped object.
 */
export declare function groupBy<T>(array: T[], makeKey: (item: T) => string): Record<string, T[]>;
/**
 * Increments the count for a key in a dictionary by 'increment'.
 * @param {StringNumberDict} counts - The counts dictionary.
 * @param {CountKey | null} [k] - The key to increment.
 * @param {number} [increment=1] - The increment amount.
 * @returns {StringNumberDict} The updated dictionary.
 */
export declare function incrementCount(counts: StringNumberDict, k?: CountKey | null, increment?: number): StringNumberDict;
/**
 * Decrements the count for a key in a dictionary.
 * @param {StringNumberDict} counts - The counts dictionary.
 * @param {CountKey | null} [k] - The key to decrement.
 * @param {number} [increment=1] - The decrement amount.
 * @returns {StringNumberDict} The updated dictionary.
 */
export declare function decrementCount(counts: StringNumberDict, k?: CountKey | null, increment?: number): StringNumberDict;
/**
 * Builds a dictionary from an array keyed by id.
 * @template T
 * @param {T[]} array - Array of objects with id property.
 * @returns {Record<string, T>} The keyed dictionary.
 */
export declare function keyById<T extends MastodonObjWithID>(array: T[]): Record<string, T>;
/**
 * Builds a dictionary from an array keyed by a property.
 * @template T
 * @param {T[]} array - Array of objects.
 * @param {(value: T) => string} keyFxn - Function to get key.
 * @returns {Record<string, T>} The keyed dictionary.
 */
export declare function keyByProperty<T>(array: T[], keyFxn: (value: T) => string): Record<string, T>;
/**
 * Splits an array into chunks of a given size or number of chunks.
 * @template T
 * @param {T[]} array - The array to chunk.
 * @param {object} options - Chunk options.
 * @param {number} [options.chunkSize] - Size of each chunk.
 * @param {Logger} [options.logger] - Logger instance.
 * @param {number} [options.numChunks] - Number of chunks.
 * @returns {T[][]} The array of chunks.
 */
export declare function makeChunks<T>(array: T[], options: {
    chunkSize?: number;
    logger?: Logger;
    numChunks?: number;
}): T[][];
/**
 * Sorts an array by a function and divides into numPercentile chunks.
 * @template T
 * @param {T[]} array - The array to sort and chunk.
 * @param {(element: T) => number | undefined} fxn - Function to get value.
 * @param {number} numPercentiles - Number of percentiles.
 * @returns {T[][]} The percentile chunks.
 */
export declare function makePercentileChunks<T>(array: T[], fxn: (element: T) => number | undefined, numPercentiles: number): T[][];
/**
 * Reduces an array to a StringNumberDict using an update function.
 * @template T
 * @param {T[]} objs - The array to reduce.
 * @param {(accumulator: StringNumberDict, obj: T) => void} updateCounts - Update function.
 * @returns {StringNumberDict} The reduced dictionary.
 */
export declare function reduceToCounts<T>(objs: T[], updateCounts: (accumulator: StringNumberDict, obj: T) => void): StringNumberDict;
/**
 * Removes keys from an object if their value is null or in keysToRemove array.
 * @template T
 * @template K
 * @param {T} obj - The object to clean.
 * @param {K[]} [keysToRemove] - Keys to remove.
 * @param {K[]} [keysToRemoveIfFalse] - Keys to remove if value is false.
 * @returns {Partial<T>} The cleaned object.
 */
export declare function removeKeys<T extends object, K extends keyof T>(obj: T, keysToRemove?: K[], keysToRemoveIfFalse?: K[]): Partial<T>;
/**
 * Randomizes the order of an array.
 * @template T
 * @param {T[]} array - The array to shuffle.
 * @returns {T[]} The shuffled array.
 */
export declare function shuffle<T extends (string | number | object)>(array: T[]): T[];
/**
 * Sorts the keys of a dictionary by their values in descending order.
 * @param {StringNumberDict} dict - The dictionary to sort.
 * @returns {string[]} The sorted keys.
 */
export declare function sortKeysByValue(dict: StringNumberDict): string[];
/**
 * Sorts an array of objects by one or two properties.
 * @template T
 * @param {T[]} array - The array to sort.
 * @param {keyof T | (keyof T)[]} prop - Property or properties to sort by.
 * @param {boolean | boolean[]} [ascending] - Sort order(s).
 * @param {boolean} [ignoreCase] - Ignore case for string properties.
 * @returns {T[]} The sorted array.
 */
export declare function sortObjsByProps<T>(array: T[], prop: keyof T | (keyof T)[], ascending?: boolean | boolean[], ignoreCase?: boolean): T[];
/**
 * Sorts an array of objects by the createdAt property.
 * @template T
 * @param {T[]} array - The array to sort.
 * @returns {T[]} The sorted array.
 */
export declare function sortObjsByCreatedAt<T extends WithCreatedAt>(array: T[]): T[];
/**
 * Splits an array into two arrays based on a condition.
 * @template T
 * @param {T[]} array - The array to split.
 * @param {(element: T) => boolean} condition - The condition function.
 * @returns {T[][]} The two arrays.
 */
export declare function split<T>(array: T[], condition: (element: T) => boolean): [T[], T[]];
/**
 * Subtracts a constant from all values in a dictionary.
 * @param {StringNumberDict} dict - The dictionary.
 * @param {number} constant - The constant to subtract.
 * @returns {StringNumberDict} The updated dictionary.
 */
export declare function subtractConstant(dict: StringNumberDict, constant: number): StringNumberDict;
/**
 * Sums the elements of an array, treating null/undefined as 0.
 * @param {(number | null | undefined)[]} arr - The array to sum.
 * @returns {number} The sum.
 */
export declare function sumArray(arr: (number | null | undefined)[]): number;
/**
 * Sums the values of a dictionary.
 * @param {StringNumberDict | Weights} obj - The dictionary.
 * @returns {number} The sum.
 */
export declare function sumValues(obj: StringNumberDict | Weights): number;
/**
 * Swaps the keys and values of a dictionary.
 * @template T
 * @param {T} dict - The dictionary.
 * @returns {StringDict} The swapped dictionary.
 */
export declare function swapKeysAndValues<T extends StringDict>(dict: T): StringDict;
/**
 * Recursively applies a transform function to all keys in a nested object.
 * @template T
 * @param {T} data - The data to transform.
 * @param {(key: string) => string} transform - The transform function.
 * @returns {T} The transformed data.
 */
export declare function transformKeys<T>(data: T, transform: (key: string) => string): T;
/**
 * Truncates an array to a maximum length, logging if truncated.
 * @param {any[]} array - The array to truncate.
 * @param {number} maxRecords - The maximum length.
 * @param {Logger} [logger] - Logger instance.
 * @returns {any[]} The truncated array.
 */
export declare function truncateToConfiguredLength(array: any[], maxRecords: number, logger?: Logger): any[];
/**
 * Returns a new array with only unique, non-null string values.
 * @param {(string | undefined)[]} array - The array to uniquify.
 * @returns {string[] | undefined} The unique array or undefined if empty.
 */
export declare const uniquify: (array: (string | undefined)[]) => string[] | undefined;
/**
 * Removes elements of an array with duplicate values for a given property.
 * @template T
 * @param {T[]} rows - The array to uniquify.
 * @param {(obj: T) => string} transform - Function to get property.
 * @param {string} [logPrefix] - Log prefix.
 * @returns {T[]} The uniquified array.
 */
export declare function uniquifyByProp<T>(rows: T[], transform: (obj: T) => string, logPrefix?: string): T[];
/**
 * Zips two arrays into a dictionary ([ 'a', 'b', 'c' ], [ 1, 2, 3 ] -> { a: 1, b: 2, c: 3 })
 * @template T
 * @param {string[]} array1 - Keys array.
 * @param {T[]} array2 - Values array.
 * @returns {Record<string, T>} The zipped dictionary.
 */
export declare function zipArrays<T>(array1: string[], array2: T[]): Record<string, T>;
/**
 * Runs a list of promises in parallel and returns a dict of results keyed by input.
 * Raises error on isAccessTokenRevokedError(), otherwise just logs a warning and moves on
 * @template T
 * @param {string[]} args - The keys.
 * @param {(s: string) => Promise<T>} promiser - The promise function.
 * @param {Logger} [logger] - Logger instance.
 * @returns {Promise<Record<string, T>>} The results dictionary.
 */
export declare function zipPromises<T>(args: string[], promiser: (s: string) => Promise<T>, logger?: Logger): Promise<Record<string, T>>;
export {};
