"use strict";
/**
 * Various helper methods for dealing with collections (arrays, objects, etc.)
 * @module collection_helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.zipPromiseCalls = exports.zipArrays = exports.uniquifyByProp = exports.uniquifyApiObjs = exports.uniquify = exports.truncateToLength = exports.transformKeys = exports.swapKeysAndValues = exports.sumValues = exports.sumArray = exports.subtractConstant = exports.split = exports.sortObjsByCreatedAt = exports.sortObjsByProps = exports.sortedDictString = exports.sortKeysByValue = exports.shuffle = exports.resolvePromiseDict = exports.removeKeys = exports.reduceToCounts = exports.makePercentileChunks = exports.makeChunks = exports.keyByProperty = exports.keyById = exports.decrementCount = exports.incrementCount = exports.groupBy = exports.getPromiseResults = exports.findMinMaxId = exports.filterWithLog = exports.countValues = exports.computeMinMax = exports.checkUniqueRows = exports.batchMap = exports.average = exports.asOptionalArray = exports.atLeastValues = exports.addDicts = void 0;
const lodash_1 = require("lodash");
const string_helpers_1 = require("./string_helpers");
const config_1 = require("../config");
const errors_1 = require("../api/errors");
const math_helper_1 = require("./math_helper");
const logger_1 = require("./logger");
const time_helpers_1 = require("./time_helpers");
const enums_1 = require("../enums");
;
;
const BATCH_MAP = "batchMap()";
/**
 * Adds up an arbitrary number of {@linkcode StringNumberDict}s, returning a new dict.
 * @param {...StringNumberDict[]} dicts - Dictionaries to sum.
 * @returns {StringNumberDict} The summed dictionary.
 */
function addDicts(...dicts) {
    const sumDict = {};
    const keys = new Set(dicts.map((dict => Object.keys(dict))).flat());
    keys.forEach((k) => {
        sumDict[k] = sumArray(dicts.map((d) => d[k] || 0));
    });
    return sumDict;
}
exports.addDicts = addDicts;
;
/**
 * Returns a new object with only the key/value pairs that have a value greater than {@linkcode minValue}.
 * @param {StringNumberDict} obj - The input dictionary.
 * @param {number} minValue - The minimum value to include.
 * @returns {StringNumberDict} The filtered dictionary.
 */
function atLeastValues(obj, minValue) {
    return Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v > minValue));
}
exports.atLeastValues = atLeastValues;
;
/**
 * Returns an array containing the value if defined, otherwise an empty array.
 * @template T
 * @param {T | undefined | null} value - The value to wrap.
 * @returns {[T] | []} The optional array.
 */
function asOptionalArray(value) {
    return (0, lodash_1.isNil)(value) ? [] : [value];
}
exports.asOptionalArray = asOptionalArray;
;
/**
 * Calculates the average of an array of numbers, ignoring {@linkcode null}/{@linkcode undefined}
 * completely.
 * @param {number[]} values - The array of numbers.
 * @returns {number} The average, or NaN if the array is empty.
 */
function average(values) {
    values = values.filter(lodash_1.isFinite);
    if (values.length == 0)
        return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
}
exports.average = average;
;
/**
 * Processes an array asynchronously in batches.
 * @template T
 * @param {T[]} array - The array to process.
 * @param {(e: T) => Promise<any>} fxn - The async function to apply.
 * @param {object} [options] - Batch options.
 * @param {number} [options.batchSize] - Batch size.
 * @param {Logger} [options.logger] - Logger instance.
 * @param {number} [options.sleepBetweenMS] - Sleep between batches in ms.
 * @returns {Promise<any[]>} The results of mapping items with {@linkcode fxn()} argument.
 */
async function batchMap(array, fxn, options) {
    options ??= {};
    const { batchSize, sleepBetweenMS } = options;
    const logger = options.logger ? options.logger.tempLogger(BATCH_MAP) : new logger_1.Logger(BATCH_MAP);
    const chunkSize = batchSize || config_1.config.scoring.scoringBatchSize;
    const chunks = makeChunks(array, { chunkSize, logger });
    let results = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const newResults = await Promise.all(chunk.map(fxn));
        if (newResults.filter(Boolean).length)
            results = [...results, ...newResults]; // Only append non-null results
        if (sleepBetweenMS && (i < (chunks.length - 1))) {
            logger.debug(`${(i + 1) * chunkSize} of ${array.length}, sleeping ${sleepBetweenMS}ms`);
            await (0, time_helpers_1.sleep)(sleepBetweenMS);
        }
    }
    ;
    return results;
}
exports.batchMap = batchMap;
;
/**
 * Checks if the elements of an array have unique IDs and logs a warning if not.
 * @param {ApiObjWithID[]} array - Array of objects with IDs.
 * @param {Logger} logger - Logger to use for warnings.
 */
function checkUniqueRows(cacheKey, array, logger) {
    const uniqObjs = uniquifyApiObjs(cacheKey, array, logger);
    if (uniqObjs.length != array.length) {
        logger.warn(`checkUniqueRows() Found ${array.length - uniqObjs.length} duplicate objects in "${cacheKey}"`);
    }
}
exports.checkUniqueRows = checkUniqueRows;
;
/**
 * Computes the minimum and maximum values from an array using a value function.
 * @template T
 * @param {T[]} array - The array to process.
 * @param {(value: T) => number | undefined} valueFxn - Function to extract value.
 * @returns {Optional<MinMax>} The min and max values, or null if array is empty.
 */
function computeMinMax(array, valueFxn) {
    if (array.length == 0)
        return null;
    return array.reduce((minMax, obj) => {
        const value = valueFxn(obj);
        if (value) {
            if (value < minMax.min)
                minMax.min = value;
            if (value > minMax.max)
                minMax.max = value;
        }
        return minMax;
    }, { min: Number.MAX_VALUE, max: Number.MIN_VALUE });
}
exports.computeMinMax = computeMinMax;
;
/**
 * Returns a dictionary keyed by the result of {@linkcode getKey()} with the count of each key.
 * @template T
 * @param {T[]} items - The items to count.
 * @param {(item: T) => string | null | undefined} [getKey] - Function to get key.
 * @param {boolean} [countNulls] - Whether to count null keys.
 * @returns {StringNumberDict} The counts dictionary.
 */
function countValues(items, getKey = (item) => item, countNulls) {
    return items.reduce((counts, item) => {
        const key = getKey(item);
        return ((0, lodash_1.isNil)(key) && !countNulls) ? counts : incrementCount(counts, key);
    }, {});
}
exports.countValues = countValues;
;
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
function filterWithLog(array, filterFxn, logger, reason, // Describe why things were filtered
objType) {
    const filtered = array.filter(filterFxn);
    logger.logArrayReduction(array, filtered, objType || "object", reason);
    return filtered;
}
exports.filterWithLog = filterWithLog;
;
/**
 * Finds the minimum and maximum {@linkcode id} property in an array of objects.
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
 * @param {ApiObjWithID[]} array - Array of objects with IDs.
 * @returns {MinMaxID | null} The min and max IDs, or null if invalid.
 */
function findMinMaxId(array) {
    if (!array?.length) {
        console.warn(`[findMinMaxId()] called with 0 length array:`, array);
        return null;
    }
    const idVals = array.map(e => e.id);
    const isNumberArray = idVals.every(math_helper_1.isNumberOrNumberString);
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
        }
        else {
            return a > b ? 1 : -1;
        }
    });
    return {
        min: sortedIDs[0].toString(),
        max: sortedIDs.slice(-1)[0].toString()
    };
}
exports.findMinMaxId = findMinMaxId;
;
/**
 * Collates the fulfilled and rejected results from
 * {@linkcode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled Promise.allSettled()}
 * into an easier to handle format.
 * @template T
 * @param {Promise<T>[]} promises - Array of promises.
 * @returns {Promise<PromisesResults<T>>} The results object.
 */
async function getPromiseResults(promises) {
    const results = await Promise.allSettled(promises);
    return {
        fulfilled: results.filter(r => r.status == "fulfilled").map(r => r.value),
        rejectedReasons: results.filter(r => r.status == "rejected").map(r => r.reason),
    };
}
exports.getPromiseResults = getPromiseResults;
;
/**
 * Groups an array by the result of {@linkcode makeKey()}.
 * TODO: Standard library Object.groupBy() requires some tsconfig setting that i don't understand
 * @template T
 * @param {T[]} array - The array to group.
 * @param {(item: T) => string} makeKey - Function to get group key.
 * @returns {Record<string, T[]>} The grouped object.
 */
function groupBy(array, makeKey) {
    return array.reduce((grouped, item) => {
        const group = makeKey(item);
        grouped[group] ||= [];
        grouped[group].push(item);
        return grouped;
    }, {});
}
exports.groupBy = groupBy;
;
/**
 * Increments the count for a key in a dictionary by {@linkcode increment}.
 * @param {StringNumberDict} counts - The counts dictionary.
 * @param {CountKey | null} [k] - The key to increment.
 * @param {number} [increment=1] - The increment amount.
 * @returns {StringNumberDict} The updated dictionary.
 */
function incrementCount(counts, k, increment = 1) {
    k = k ?? "unknown";
    counts[k] = (counts[k] || 0) + increment;
    return counts;
}
exports.incrementCount = incrementCount;
;
/**
 * Return true if the object is a non-null object (not an array, function, etc.).
 * @param {unknown} obj - The object to check.
 * @returns {boolean} True if it's a non-null object
 */
function isRecord(obj) {
    return typeof obj === "object" && obj !== null && obj.constructor.name === "Object";
}
;
/**
 * Decrements the count for a key in a dictionary.
 * @param {StringNumberDict} counts - The counts dictionary.
 * @param {CountKey | null} [k] - The key to decrement.
 * @param {number} [increment=1] - The decrement amount.
 * @returns {StringNumberDict} The updated dictionary.
 */
function decrementCount(counts, k, increment = 1) {
    return incrementCount(counts, k, -1 * increment);
}
exports.decrementCount = decrementCount;
;
/**
 * Builds a dictionary from an array keyed by id.
 * @template T
 * @param {T[]} array - Array of objects with id property.
 * @returns {Record<string, T>} The keyed dictionary.
 */
function keyById(array) {
    return keyByProperty(array, obj => obj.id);
}
exports.keyById = keyById;
;
/**
 * Builds a dictionary from an array keyed by a property.
 * @template T
 * @param {T[]} array - Array of objects.
 * @param {(value: T) => string} keyFxn - Function to get key.
 * @returns {Record<string, T>} The keyed dictionary.
 */
function keyByProperty(array, keyFxn) {
    return array.reduce((keyedDict, obj) => {
        keyedDict[keyFxn(obj)] = obj;
        return keyedDict;
    }, {});
}
exports.keyByProperty = keyByProperty;
;
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
function makeChunks(array, options) {
    const { logger, numChunks } = options;
    let { chunkSize } = options;
    if ((numChunks && chunkSize) || (!numChunks && !chunkSize)) {
        throw new Error(`${logger?.logPrefix || 'makeChunks'} requires numChunks OR chunkSize. options=${JSON.stringify(options)}`);
    }
    chunkSize = numChunks ? Math.ceil(array.length / numChunks) : chunkSize;
    return (0, lodash_1.chunk)(array, chunkSize);
}
exports.makeChunks = makeChunks;
;
/**
 * Sorts an array by a function and divides into {@linkcode numPercentile} chunks.
 * @template T
 * @param {T[]} array - The array to sort and chunk.
 * @param {(element: T) => number | undefined} fxn - Function to get value.
 * @param {number} numPercentiles - Number of percentiles.
 * @returns {T[][]} The percentile chunks.
 */
function makePercentileChunks(array, fxn, numPercentiles) {
    const sortedArray = array.toSorted((a, b) => (fxn(a) ?? 0) - (fxn(b) ?? 0));
    return makeChunks(sortedArray, { numChunks: numPercentiles });
}
exports.makePercentileChunks = makePercentileChunks;
;
/**
 * Reduces an array to a {@linkcode StringNumberDict} using an update function.
 * @template T
 * @param {T[]} objs - The array to reduce.
 * @param {(accumulator: StringNumberDict, obj: T) => void} updateCounts - Update function.
 * @returns {StringNumberDict} The reduced dictionary.
 */
function reduceToCounts(objs, updateCounts) {
    return objs.reduce((counts, obj) => {
        updateCounts(counts, obj);
        return counts;
    }, {});
}
exports.reduceToCounts = reduceToCounts;
;
/**
 * Removes keys from an object if their value is {@linkcode null} or in {@linkcode keysToRemove} array.
 * @template T
 * @template K
 * @param {T} obj - The object to clean.
 * @param {K[]} [keysToRemove] - Keys to remove.
 * @param {K[]} [keysToRemoveIfFalse] - Keys to remove if value is false.
 * @returns {Partial<T>} The cleaned object.
 */
function removeKeys(obj, keysToRemove, keysToRemoveIfFalse) {
    const copy = { ...obj };
    Object.keys(copy).forEach((k) => {
        const key = k;
        if ((keysToRemove || []).includes(key) || copy[key] === null || copy[key] === undefined) {
            delete copy[key];
        }
        else if ((keysToRemoveIfFalse || []).includes(key) && copy[key] === false) {
            delete copy[key];
        }
    });
    return copy;
}
exports.removeKeys = removeKeys;
;
/**
 * Use {@linkcode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled Promise.allSettled()}
 * to resolve a dictionary of promises in parallel.
 * @param {PromiseDict} dict - Dictionary of promises to resolve.
 * @param {Logger} logger - Logger instance for logging errors.
 * @returns {Promise<Record<string, any>>} The cleaned object.
 */
async function resolvePromiseDict(dict, logger, defaultValue = null) {
    // Ensure order of keys and values // TODO: is this necessary?
    const indexed = Object.entries(dict).reduce((keysAndValues, [k, v]) => {
        keysAndValues[0].push(k);
        keysAndValues[1].push(v);
        return keysAndValues;
    }, [[], []]);
    const resolved = (await Promise.allSettled(indexed[1])).map((r, i) => {
        if (r.status === "fulfilled") {
            return r.value;
        }
        else {
            const failedKey = indexed[0][i];
            logger.warn(`resolvePromiseDict() - Promise for key "${failedKey}" failed with reason:`, r.reason);
            return typeof defaultValue == 'function' ? defaultValue(failedKey) : defaultValue;
        }
    });
    return zipArrays(indexed[0], resolved);
}
exports.resolvePromiseDict = resolvePromiseDict;
;
/**
 * Randomizes the order of an array.
 * @template T
 * @param {T[]} array - The array to shuffle.
 * @returns {T[]} The shuffled array.
 */
function shuffle(array) {
    const sortRandom = (a, b) => (0, string_helpers_1.hashObject)(a).localeCompare((0, string_helpers_1.hashObject)(b));
    return array.toSorted(sortRandom);
}
exports.shuffle = shuffle;
;
/**
 * Sorts the keys of a dictionary by their values in descending order.
 * @param {StringNumberDict} dict - The dictionary to sort.
 * @returns {string[]} The sorted keys.
 */
function sortKeysByValue(dict) {
    return Object.keys(dict).sort((a, b) => {
        const aVal = dict[a] || 0;
        const bVal = dict[b] || 0;
        if (aVal == bVal) {
            return (0, string_helpers_1.compareStr)(a, b);
        }
        else {
            return bVal - aVal;
        }
    });
}
exports.sortKeysByValue = sortKeysByValue;
;
/**
 * Create a string representation of a dictionary with the keys sorted by their values.
 * @param {StringNumberDict} dict - The dictionary to sort and format.
 * @returns {string} The sorted dictionary as a string.
 */
function sortedDictString(dict) {
    return "\n   " + sortKeysByValue(dict).map(k => `${k}: ${dict[k]}`).join(",\n    ");
}
exports.sortedDictString = sortedDictString;
;
/**
 * Sorts an array of objects by one or two properties.
 * @template T
 * @param {T[]} array - The array to sort.
 * @param {keyof T | (keyof T)[]} prop - Property or properties to sort by.
 * @param {boolean | boolean[]} [ascending] - Sort order(s).
 * @param {boolean} [ignoreCase] - Ignore case for string properties.
 * @returns {T[]} The sorted array.
 */
function sortObjsByProps(array, prop, ascending, ignoreCase) {
    ascending ||= false;
    const props = Array.isArray(prop) ? prop : [prop];
    const ascendings = Array.isArray(ascending) ? ascending : [ascending];
    if (props.length > 2)
        throw new Error("sortObjsByProps() only supports 2 properties for sorting for now");
    return array.toSorted((a, b) => {
        let aVal = a[props[0]];
        let bVal = b[props[0]];
        let ascending = ascendings[0];
        if (ignoreCase && typeof aVal == "string" && typeof bVal == "string") {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        if (aVal < bVal)
            return ascending ? -1 : 1;
        if (aVal > bVal)
            return ascending ? 1 : -1;
        if (props.length == 1)
            return 0;
        // Compare second property
        aVal = a[props[1]];
        bVal = b[props[1]];
        ascending = ascendings.length > 1 ? ascendings[1] : ascendings[0];
        if (ignoreCase && typeof aVal == "string" && typeof bVal == "string") {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        if (aVal < bVal)
            return ascending ? -1 : 1;
        if (aVal > bVal)
            return ascending ? 1 : -1;
        return 0;
    });
}
exports.sortObjsByProps = sortObjsByProps;
;
/**
 * Sorts an array of objects by the {@linkcode createdAt} property.
 * @template T
 * @param {T[]} array - The array to sort.
 * @returns {T[]} The sorted array.
 */
function sortObjsByCreatedAt(array) {
    return sortObjsByProps(array, "createdAt");
}
exports.sortObjsByCreatedAt = sortObjsByCreatedAt;
;
/**
 * Splits an array into two arrays based on a condition.
 * @template T
 * @param {T[]} array - The array to split.
 * @param {(element: T) => boolean} condition - The condition function.
 * @returns {T[][]} The two arrays.
 */
function split(array, condition) {
    return [
        array.filter((element) => condition(element)),
        array.filter((element) => !condition(element)),
    ];
}
exports.split = split;
;
/**
 * Subtracts a constant from all values in a dictionary.
 * @param {StringNumberDict} dict - The dictionary.
 * @param {number} constant - The constant to subtract.
 * @returns {StringNumberDict} The updated dictionary.
 */
function subtractConstant(dict, constant) {
    return Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, v - constant]));
}
exports.subtractConstant = subtractConstant;
;
/**
 * Sums the elements of an array. {@linkcode null} and {@linkcode undefined} count as 0.
 * @param {OptionalNumber[]} array - The array to sum.
 * @returns {number} The sum (0 if empty)
 */
function sumArray(array) {
    return array.map((x) => (x ?? 0)).reduce((total, b) => total + b, 0);
}
exports.sumArray = sumArray;
;
/**
 * Sums the values of a dictionary. {@linkcode null} and {@linkcode undefined} count as 0.
 * @param {StringNumberDict | Weights} obj - The dictionary.
 * @returns {number} The sum.
 */
function sumValues(obj) {
    return sumArray(Object.values(obj));
}
exports.sumValues = sumValues;
;
/**
 * Swaps the keys and values of a dictionary.
 * @template T
 * @param {T} dict - The dictionary.
 * @returns {StringDict} The swapped dictionary.
 */
function swapKeysAndValues(dict) {
    return Object.fromEntries(Object.entries(dict).map(entry => entry.toReversed()));
}
exports.swapKeysAndValues = swapKeysAndValues;
;
/**
 * Recursively applies a {@linkcode transform()} function to all keys in a nested object.
 * @template T
 * @param {T} data - The data to transform.
 * @param {(key: string) => string} transform - The transform function.
 * @returns {T} The transformed data.
 */
function transformKeys(data, transform) {
    if (Array.isArray(data)) {
        return data.map((value) => transformKeys(value, transform));
    }
    if (isRecord(data)) {
        return Object.fromEntries(Object.entries(data).map(([key, value]) => [
            transform(key),
            transformKeys(value, transform),
        ]));
    }
    return data;
}
exports.transformKeys = transformKeys;
;
/**
 * Truncates an array to a maximum length, logging if truncated.
 * @template T
 * @param {T[]} array - The array to truncate.
 * @param {number} maxRecords - The maximum length.
 * @param {Logger} [logger] - Logger instance.
 * @returns {T[]} The truncated array.
 */
function truncateToLength(array, maxRecords, logger) {
    if (array.length <= maxRecords)
        return array;
    const startLen = array.length;
    array = array.slice(0, maxRecords);
    (logger ?? new logger_1.Logger("truncateToConfiguredLength()")).deep(`Truncated array of ${startLen} to ${array.length}`);
    return array;
}
exports.truncateToLength = truncateToLength;
;
/**
 * Returns a new array with only unique, non-null string values.
 * @param {OptionalString[]} array - The array to uniquify.
 * @returns {string[] | undefined} The unique array or undefined if empty.
 */
const uniquify = (array) => {
    const nonNullArray = [...new Set(array.filter((element) => !(0, lodash_1.isNil)(element)))];
    return nonNullArray.length ? nonNullArray : undefined;
};
exports.uniquify = uniquify;
/**
 * Uniquify an array of API objects by the appropriate property. This is a no-op for API objects
 * that don't have a property that can be used to uniquely identify them.
 * @template T
 * @param {ApiCacheKey} cacheKey - The cache key to determine the unique property.
 * @param {T[]} array - Array of API objects.
 * @param {Logger} logger - Logger to use for warnings.
 */
function uniquifyApiObjs(cacheKey, array, logger) {
    const uniqueProperty = enums_1.UNIQUE_ID_PROPERTIES[cacheKey];
    const thisLogger = logger.tempLogger(`uniquifyApiObjs`);
    if (!uniqueProperty) {
        thisLogger.trace(`No unique property for "${cacheKey}", skipping uniquify...`);
        return array;
    }
    else if (array.length && (0, lodash_1.isNil)(array[0][uniqueProperty])) {
        thisLogger.error(`checkUniqueRows() called with array that has no "${uniqueProperty}" property!`, array);
        return array;
    }
    logger.deep(`Uniquifying array of ${array.length} objects by "${uniqueProperty}" property`);
    return uniquifyByProp(array, (obj) => obj[uniqueProperty], cacheKey);
}
exports.uniquifyApiObjs = uniquifyApiObjs;
;
/**
 * Removes elements of an array with duplicate values for a given property.
 * @template T
 * @param {T[]} rows - The array to uniquify.
 * @param {(obj: T) => string} transform - Function to get property.
 * @param {string} [logPrefix] - Log prefix.
 * @returns {T[]} The uniquified array.
 */
function uniquifyByProp(rows, transform, logPrefix) {
    const logger = new logger_1.Logger(logPrefix || 'collections_helpers', "uniquifyByProp()");
    const newRows = [...new Map(rows.map((element) => [transform(element).toLowerCase(), element])).values()];
    if (logPrefix && newRows.length < rows.length) {
        logger.trace(`Removed ${rows.length - newRows.length} duplicate rows`);
    }
    return newRows;
}
exports.uniquifyByProp = uniquifyByProp;
;
/**
 * Zips two arrays into a dictionary
 * @template T
 * @param {string[]} array1 - Keys array.
 * @param {T[]} array2 - Values array.
 * @returns {Record<string, T>} The zipped dictionary.
 * @example zipArrays([ 'a', 'b', 'c' ], [ 1, 2, 3 ]) -> { a: 1, b: 2, c: 3 }
 */
function zipArrays(array1, array2) {
    return Object.fromEntries(array1.map((e, i) => [e, array2[i]]));
}
exports.zipArrays = zipArrays;
;
/**
 * Runs a list of {@linkcode Promise}s in parallel, each generated by a call to {@linkcode promiser(arg)},
 * and returns a dict of results keyed by input. Raises error on {@linkcode api_errors:isAccessTokenRevokedError},
 * otherwise just logs a warning and moves on.
 * @template T
 * @param {string[]} args - The keys.
 * @param {(s: string) => Promise<T>} promiser - The promise function.
 * @param {Logger} [logger] - Logger instance.
 * @returns {Promise<Record<string, T>>} The results dictionary.
 */
async function zipPromiseCalls(args, promiser, logger) {
    const allResults = zipArrays(args, await Promise.allSettled(args.map(promiser)));
    logger ||= new logger_1.Logger(`zipPromises`);
    return Object.entries(allResults).reduce((results, [arg, result]) => {
        if (result.status == "fulfilled") {
            results[arg] = result.value;
        }
        else {
            if ((0, errors_1.isAccessTokenRevokedError)(result.reason)) {
                throw result.reason;
            }
            else {
                logger.warn(`Failure on argument "${arg}":`, result.reason);
            }
        }
        return results;
    }, {});
}
exports.zipPromiseCalls = zipPromiseCalls;
;
// TODO: unused stuff below here
// From https://dev.to/nikosanif/create-promises-with-timeout-error-in-typescript-fmm
function _promiseWithTimeout(promise, milliseconds, timeoutError = new Error('Promise timed out')) {
    // create a promise that rejects in milliseconds
    const timeout = new Promise((_, reject) => {
        setTimeout(() => {
            reject(timeoutError);
        }, milliseconds);
    });
    // returns a race between timeout and the passed promise
    return Promise.race([promise, timeout]);
}
;
//# sourceMappingURL=collection_helpers.js.map