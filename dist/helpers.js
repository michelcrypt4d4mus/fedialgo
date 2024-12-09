"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.atLeastValues = exports.zipPromises = exports.zipArrays = exports.countValues = exports.incrementCount = exports.isRecord = exports.transformKeys = exports.groupBy = exports.isImage = exports.average = exports.createRandomString = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.VIDEO = exports.IMAGE_EXTENSIONS = exports.IMAGE = void 0;
exports.IMAGE = "image";
exports.IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
exports.VIDEO = "video";
exports.VIDEO_TYPES = ["gifv", exports.VIDEO];
exports.MEDIA_TYPES = [exports.IMAGE, ...exports.VIDEO_TYPES];
function createRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
exports.createRandomString = createRandomString;
;
// Take the average of an array of numbers, ignoring undefined values
function average(values) {
    values = values.filter(v => !!v);
    if (values.length == 0)
        return NaN;
    return values.filter(v => v != undefined).reduce((a, b) => a + b, 0) / values.length;
}
exports.average = average;
;
// Return true if uri ends with an image extension like .jpg or .png
function isImage(uri) {
    if (!uri)
        return false;
    return exports.IMAGE_EXTENSIONS.some(ext => uri.endsWith(ext));
}
exports.isImage = isImage;
;
// TODO: Standard Object.groupBy() would require some tsconfig setting that i don't know about
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
const transformKeys = (data, transform) => {
    if (Array.isArray(data)) {
        return data.map((value) => (0, exports.transformKeys)(value, transform));
    }
    if ((0, exports.isRecord)(data)) {
        return Object.fromEntries(Object.entries(data).map(([key, value]) => [
            transform(key),
            (0, exports.transformKeys)(value, transform),
        ]));
    }
    return data;
};
exports.transformKeys = transformKeys;
// Masto does not support top posts from foreign servers, so we have to do it manually
const isRecord = (x) => {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
};
exports.isRecord = isRecord;
// Add 1 to the number at counts[key], or set it to 1 if it doesn't exist
const incrementCount = (counts, key) => {
    key = key ?? "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
};
exports.incrementCount = incrementCount;
// Return a dict keyed by the result of getKey() with the number of times that result appears in 'items'
function countValues(items, getKey, countNulls) {
    return items.reduce((counts, item) => {
        const key = getKey(item);
        if (key == null && !countNulls)
            return counts;
        return (0, exports.incrementCount)(counts, key);
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
async function zipPromises(args, promiser) {
    return zipArrays(args, await Promise.all(args.map(promiser)));
}
exports.zipPromises = zipPromises;
;
// Return a new object with only the key/value pairs that have a value greater than minValue
function atLeastValues(obj, minValue) {
    return Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v > minValue));
}
exports.atLeastValues = atLeastValues;
;
//# sourceMappingURL=helpers.js.map