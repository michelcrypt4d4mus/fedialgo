"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRandomString = exports.replaceEmojiShortcodesWithImageTags = exports.atLeastValues = exports.sortKeysByValue = exports.zipPromises = exports.zipArrays = exports.countValues = exports.incrementCount = exports.transformKeys = exports.groupBy = exports.isVideo = exports.isImage = exports.average = exports.htmlToText = exports.extractDomain = exports.DEFAULT_FONT_SIZE = exports.MEDIA_TYPES = exports.VIDEO_EXTENSIONS = exports.VIDEO_TYPES = exports.VIDEO = exports.IMAGE_EXTENSIONS = exports.IMAGE = exports.AUDIO = void 0;
exports.AUDIO = "audio";
exports.IMAGE = "image";
exports.IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
exports.VIDEO = "video";
exports.VIDEO_TYPES = [exports.VIDEO, "gifv"];
exports.VIDEO_EXTENSIONS = ["mp4"];
exports.MEDIA_TYPES = [exports.AUDIO, exports.IMAGE, ...exports.VIDEO_TYPES];
exports.DEFAULT_FONT_SIZE = 15;
const EARLIEST_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");
// "http://mast.ai/foobar" => "mast.ai"
const extractDomain = (url) => url?.split("/")[2];
exports.extractDomain = extractDomain;
// Remove HTML tags and newlines from a string
function htmlToText(html) {
    let txt = html.replace(/<\/p>/gi, "\n").trim(); // Turn closed <p> tags into newlines
    txt = txt.replace(/<[^>]+>/g, ""); // Strip HTML tags
    txt = txt.replace(/\n/g, " "); // Strip newlines
    txt = txt.replace(/\s+/g, " "); // Collapse multiple spaces
    return txt.trim();
}
exports.htmlToText = htmlToText;
;
// Take the average of an array of numbers, ignoring undefined values
function average(values) {
    values = values.filter(v => !!v);
    if (values.length == 0)
        return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
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
// Return true if uri ends with an image extension like .jpg or .png
function isVideo(uri) {
    if (!uri)
        return false;
    return exports.VIDEO_EXTENSIONS.some(ext => uri.endsWith(ext));
}
exports.isVideo = isVideo;
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
function replaceEmojiShortcodesWithImageTags(html, emojis, fontSize = exports.DEFAULT_FONT_SIZE) {
    const fontSizeStr = `${fontSize}px`;
    emojis.forEach((emoji) => {
        const shortcode = `:${emoji.shortcode}:`;
        html = html.replace(new RegExp(shortcode, 'g'), `<img src="${emoji.url}" alt="${shortcode}" height="${fontSizeStr}" width="${fontSizeStr}">`);
    });
    return html;
}
exports.replaceEmojiShortcodesWithImageTags = replaceEmojiShortcodesWithImageTags;
;
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
// Mastodon does not support top posts from foreign servers, so we have to do it manually
function isRecord(x) {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
}
;
//# sourceMappingURL=helpers.js.map