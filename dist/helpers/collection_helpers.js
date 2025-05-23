"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zipPromises = exports.zipArrays = exports.uniquifyByProp = exports.uniquify = exports.truncateToConfiguredLength = exports.transformKeys = exports.sumValues = exports.sumArray = exports.split = exports.sortObjsByProps = exports.sortKeysByValue = exports.shuffle = exports.percentileSegments = exports.keyByProperty = exports.isStorageKey = exports.isValueInStringEnum = exports.decrementCount = exports.incrementCount = exports.groupBy = exports.findMinMaxId = exports.filterWithLog = exports.countValues = exports.computeMinMax = exports.checkUniqueIDs = exports.batchMap = exports.average = exports.atLeastValues = void 0;
/*
 * Various helper methods for dealing with collections (arrays, objects, etc.)
 */
const string_helpers_1 = require("./string_helpers");
const config_1 = require("../config");
const types_1 = require("../types");
// Return a new object with only the key/value pairs that have a value greater than minValue
function atLeastValues(obj, minValue) {
    return Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v > minValue));
}
exports.atLeastValues = atLeastValues;
;
// Take the average of an array of numbers. null and undefined are excluded, not treated like zero.
function average(values) {
    values = values.filter(v => v || v == 0);
    if (values.length == 0)
        return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
}
exports.average = average;
;
// Process a list of promises in batches of batchSize. Returns list of results mapped by mapFxn.
// From https://dev.to/woovi/processing-promises-in-batch-2le6
//    - items: array of items to process
//    - mapFxn: function to call for each item
//    - label: optional label for logging
//    - batchSize: number of items to process at once
//    - sleepBetweenMS: optional number of milliseconds to sleep between batches
async function batchMap(items, mapFxn, label, batchSize, sleepBetweenMS) {
    batchSize ||= config_1.config.scoring.scoringBatchSize;
    let results = [];
    let logPrefix = `[${label || 'batchMap'}]`;
    for (let start = 0; start < items.length; start += batchSize) {
        const end = start + batchSize > items.length ? items.length : start + batchSize;
        const slicedResults = await Promise.all(items.slice(start, end).map(mapFxn));
        results = [...results, ...slicedResults];
        if (sleepBetweenMS && (items.length > end)) {
            console.debug(`${logPrefix} batchMap() ${end} of ${items.length}, sleeping for ${sleepBetweenMS}ms...`);
            await new Promise((resolve) => setTimeout(resolve, sleepBetweenMS));
        }
    }
    return results;
}
exports.batchMap = batchMap;
;
// Check if the elements of 'array' are as unique as they should be
function checkUniqueIDs(array, label) {
    const logPrefix = `[${label}]`;
    // traceLog(`${logPrefix} Checking ${array.length} ${label} IDs for uniqueness...`);
    const objsByID = groupBy(array, (e) => e.id);
    const uniqueIDs = Object.keys(objsByID);
    if (uniqueIDs.length != array.length) {
        console.warn(`${logPrefix} ${array.length} objs only have ${uniqueIDs.length} unique IDs!`, objsByID);
    }
}
exports.checkUniqueIDs = checkUniqueIDs;
;
// Get minimum and maximum values from an array of objects using the given valueFxn to extract the value
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
// Return a dict keyed by the result of getKey() with the number of times that result appears in 'items'
function countValues(items, getKey = (item) => item, countNulls) {
    return items.reduce((counts, item) => {
        const key = getKey(item);
        if (key == null && !countNulls)
            return counts;
        return incrementCount(counts, key);
    }, {});
}
exports.countValues = countValues;
;
// Basic collection filter but logs the numebr of elements removed
function filterWithLog(array, filterFxn, logPrefix, reason, // Describe why things were filtered
objType) {
    objType ||= 'obj';
    const startingLength = array.length;
    const filtered = array.filter(filterFxn);
    const numRemoved = startingLength - filtered.length;
    if (numRemoved > 0) {
        console.debug(`${(0, string_helpers_1.bracketed)(logPrefix)} Removed ${numRemoved} ${reason} ${objType}s leaving ${filtered.length}`);
    }
    return filtered;
}
exports.filterWithLog = filterWithLog;
;
// Find the minimum id in an array of objects using the given idFxn to extract the id
// TODO: Note that this isn't always safe to use - there can be outliers in the data that result in
// the minimum ID in a set of toots being wildly out of step with the rest of the IDs.
// If that happens trying to use the min ID as the maxId param for a fetch will fail (no results).
// This is an unfixable server side problem that we work around in TheAlgorithm.maybeFetchMoreData()
function findMinMaxId(array) {
    if (!array.length) {
        console.warn(`[findMinMaxId()] called with 0 length array:`, array);
        return undefined;
    }
    const idVals = array.map(e => e.id);
    const isNumberArray = idVals.every(string_helpers_1.isNumber);
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
// TODO: Standard library Object.groupBy() requires some tsconfig setting that i don't understand
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
// Add 1 to the number at counts[key], or set it to 1 if it doesn't exist
function incrementCount(counts, k, increment = 1) {
    k = k ?? "unknown";
    counts[k] = (counts[k] || 0) + increment;
    return counts;
}
exports.incrementCount = incrementCount;
;
function decrementCount(counts, k, increment = 1) {
    return incrementCount(counts, k, -1 * increment);
}
exports.decrementCount = decrementCount;
;
// Mastodon does not support top posts from foreign servers, so we have to do it manually
function isRecord(x) {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
}
;
{ /* Mapping enums is annoying. See: https://www.typescriptlang.org/play/?ts=5.0.4#code/KYDwDg9gTgLgBMAdgVwLZwDIENEHNla7ADOAongDYCWxAFnAN4BQccA5EgKoDKbcAvO3K5qdNgBoW7AF60AEjhh9BbALI4AJlihVE4uABUoWDVRhUIiLBQlMAvkyYwAnmGBwwVAMYBrYFAB5MHNLAUYpLwgNYAAuOD9nCAAzOBc3ZMwcfEISYVFaAG4pCiwAI2AKOOw8AiIyShpC+yKmJORELxDEOCJEfywYYCCugAoEuISMtOAM6uy6vMaASjjPX39hi27mVihgGGQobalWSOiJ4GdJVlYS8srMmpz6kUaAbQSAXWu4OyKHJiRRDEeAQYJbYhhEZSAKlABWwE6ADoEsQRnNarkGnQlnAsJCxpcpq4ZikMc9Fji3p8mEskagsGARr1+oNNpYlkUgA */ }
// Generate a fxn to check if a string is in an enum.
// From https://stackoverflow.com/questions/72050271/check-if-value-exists-in-string-enum-in-typescript
function isValueInStringEnum(strEnum) {
    const enumValues = new Set(Object.values(strEnum));
    return (value) => enumValues.has(value);
}
exports.isValueInStringEnum = isValueInStringEnum;
;
const isStorageKey = (value) => isValueInStringEnum(types_1.CacheKey)(value);
exports.isStorageKey = isStorageKey;
// Build a dictionary from the result of keyFxn() for each object in the array
function keyByProperty(array, keyFxn) {
    return array.reduce((keyedDict, obj) => {
        keyedDict[keyFxn(obj)] = obj;
        return keyedDict;
    }, {});
}
exports.keyByProperty = keyByProperty;
;
// Divide array into numPercentiles sections, returns array of arrays of type T objects
function percentileSegments(array, fxn, numPercentiles) {
    array = array.toSorted((a, b) => (fxn(a) ?? 0) - (fxn(b) ?? 0));
    let batchSize = array.length / numPercentiles;
    if (batchSize % 1 != 0)
        batchSize += 1;
    batchSize = Math.floor(batchSize);
    const percentileSegments = [];
    for (let start = 0; start < array.length; start += batchSize) {
        const end = start + batchSize > array.length ? array.length : start + batchSize;
        const section = array.slice(start, end);
        percentileSegments.push(section);
    }
    return percentileSegments;
}
exports.percentileSegments = percentileSegments;
;
// Randomize the order of an array
function shuffle(array) {
    const sortRandom = (a, b) => (0, string_helpers_1.hashObject)(a).localeCompare((0, string_helpers_1.hashObject)(b));
    return array.toSorted(sortRandom);
}
exports.shuffle = shuffle;
;
// Sort the keys of a dict by their values in descending order
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
// Sort an array of objects by given property (or properties - extra props are used as tiebreakers).
// If ascending is true, sort in ascending order (low to high)
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
        ascending = ascendings.length > 1 ? ascendings[1] : ascendings[1];
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
// Return a two element array of arrays, the first of which contains all elements that match
// the condition and the second contains all elements that do not match.
function split(array, condition) {
    return [
        array.filter((element) => condition(element)),
        array.filter((element) => !condition(element)),
    ];
}
exports.split = split;
;
// Sum the elements of an array
function sumArray(arr) {
    const numArray = arr.map((x) => (x ?? 0));
    return numArray.reduce((a, b) => a + b, 0);
}
exports.sumArray = sumArray;
;
// Sum the values of a dict
function sumValues(obj) {
    return sumArray(Object.values(obj));
}
exports.sumValues = sumValues;
;
// Apply a transform() function to all keys in a nested object.
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
// Find the configured value at configKey and truncate array to that length
function truncateToConfiguredLength(array, maxRecords, label) {
    if (array.length <= maxRecords)
        return array;
    const logPfx = (0, string_helpers_1.bracketed)(label || "truncateToConfiguredLength()");
    const startLen = array.length;
    array = array.slice(0, maxRecords);
    console.log(`${logPfx} Truncated array of ${startLen} to ${array.length} to ${maxRecords}`);
    return array;
}
exports.truncateToConfiguredLength = truncateToConfiguredLength;
;
// Return a new array with only unique non null values
const uniquify = (array) => {
    if (array.length == 0)
        return undefined;
    let newArray = array.filter((e) => e != undefined);
    newArray = [...new Set(newArray)];
    return newArray;
};
exports.uniquify = uniquify;
// Remove elements of an array if they have duplicate values for the given transform function
function uniquifyByProp(array, transform) {
    return [...new Map(array.map((element) => [transform(element), element])).values()];
}
exports.uniquifyByProp = uniquifyByProp;
;
// [ 'a', 'b', 'c' ], [ 1, 2, 3 ] -> { a: 1, b: 2, c: 3 }
function zipArrays(array1, array2) {
    return Object.fromEntries(array1.map((e, i) => [e, array2[i]]));
}
exports.zipArrays = zipArrays;
;
// Run a list of promises in parallel and return a dict of the results keyed by the input
async function zipPromises(args, promiser) {
    return zipArrays(args, await Promise.all(args.map(promiser)));
}
exports.zipPromises = zipPromises;
;
//# sourceMappingURL=collection_helpers.js.map