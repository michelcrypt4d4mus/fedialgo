"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniquifyByProp = exports.shuffle = exports.sumValues = exports.atLeastValues = exports.sortKeysByValue = exports.zipPromises = exports.zipArrays = exports.countValues = exports.incrementCount = exports.transformKeys = exports.groupBy = exports.average = void 0;
/*
 * Various helper methods for dealing with collections (arrays, objects, etc.)
 */
const blueimp_md5_1 = __importDefault(require("blueimp-md5"));
// Take the average of an array of numbers, ignoring undefined values
function average(values) {
    values = values.filter(v => !!v);
    if (values.length == 0)
        return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
}
exports.average = average;
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
// Add 1 to the number at counts[key], or set it to 1 if it doesn't exist
function incrementCount(counts, key, increment = 1) {
    key = key ?? "unknown";
    counts[key] = (counts[key] || 0) + increment;
    return counts;
}
exports.incrementCount = incrementCount;
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
// Sort the keys of a dict by their values in descending order
function sortKeysByValue(dict) {
    return Object.keys(dict).sort((a, b) => dict[b] - dict[a]);
}
exports.sortKeysByValue = sortKeysByValue;
;
// Return a new object with only the key/value pairs that have a value greater than minValue
function atLeastValues(obj, minValue) {
    return Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v > minValue));
}
exports.atLeastValues = atLeastValues;
;
function sumValues(obj) {
    return Object.values(obj).reduce((a, b) => a + b, 0);
}
exports.sumValues = sumValues;
;
// Mastodon does not support top posts from foreign servers, so we have to do it manually
function isRecord(x) {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
}
;
// Randomize the order of an array
function shuffle(array) {
    const sortRandom = (a, b) => (0, blueimp_md5_1.default)(JSON.stringify(a)).localeCompare(JSON.stringify(b));
    return array.toSorted(sortRandom);
}
exports.shuffle = shuffle;
;
// Remove elements of an array if they have duplicate values for the given transform function
function uniquifyByProp(array, transform) {
    return [...new Map(array.map((element) => [transform(element), element])).values()];
}
exports.uniquifyByProp = uniquifyByProp;
;
//# sourceMappingURL=collection_helpers.js.map