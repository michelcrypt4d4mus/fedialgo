"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementCount = exports.isRecord = exports.transformKeys = exports.groupBy = exports.dedupeToots = exports.isImage = exports.average = exports.createRandomString = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.VIDEO = exports.IMAGE_EXTENSIONS = exports.IMAGE = void 0;
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
// Remove dupes by uniquifying on the toot's URI
function dedupeToots(toots, logLabel = undefined) {
    const prefix = logLabel ? `[${logLabel}] ` : '';
    const tootsByURI = groupBy(toots, (toot) => toot.uri);
    Object.entries(tootsByURI).forEach(([uri, uriToots]) => {
        if (!uriToots || uriToots.length == 0)
            return;
        const allTrendingTags = uriToots.flatMap(toot => toot.trendingTags || []);
        const uniqueTrendingTags = [...new Map(allTrendingTags.map((tag) => [tag.name, tag])).values()];
        // if (allTrendingTags.length > 0 && uniqueTrendingTags.length != allTrendingTags.length) {
        //     console.debug(`${prefix}allTags for ${uri}:`, allTrendingTags);
        //     console.debug(`${prefix}uniqueTags for ${uri}:`, uniqueTrendingTags);
        // }
        // Set all toots to have all trending tags so when we uniquify we catch everything
        uriToots.forEach((toot) => {
            toot.trendingTags = uniqueTrendingTags || [];
        });
    });
    const deduped = [...new Map(toots.map((toot) => [toot.uri, toot])).values()];
    console.log(`${prefix}Removed ${toots.length - deduped.length} duplicate toots leaving ${deduped.length}:`, deduped);
    return deduped;
}
exports.dedupeToots = dedupeToots;
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
const incrementCount = (counts, key) => {
    key = key ?? "unknown";
    counts[key] = (counts[key] || 0) + 1;
};
exports.incrementCount = incrementCount;
//# sourceMappingURL=helpers.js.map