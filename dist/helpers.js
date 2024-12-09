"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countValues = exports.incrementCount = exports.isRecord = exports.transformKeys = exports.groupBy = exports.isImage = exports.average = exports.createRandomString = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.VIDEO = exports.IMAGE_EXTENSIONS = exports.IMAGE = void 0;
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
function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
        const group = key(item);
        acc[group] ||= [];
        acc[group].push(item);
        return acc;
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
function countValues(items, getKey) {
    return items.reduce((counts, item) => (0, exports.incrementCount)(counts, getKey(item)), {});
}
exports.countValues = countValues;
//# sourceMappingURL=helpers.js.map