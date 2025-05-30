"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendingType = exports.MediaCategory = exports.FEDIVERSE_KEYS = void 0;
const Storage_1 = require("./Storage");
exports.FEDIVERSE_KEYS = [
    Storage_1.CacheKey.FEDIVERSE_POPULAR_SERVERS,
    Storage_1.CacheKey.FEDIVERSE_TRENDING_LINKS,
    Storage_1.CacheKey.FEDIVERSE_TRENDING_TAGS,
    Storage_1.CacheKey.FEDIVERSE_TRENDING_TOOTS,
];
// Self explanatory
var MediaCategory;
(function (MediaCategory) {
    MediaCategory["AUDIO"] = "audio";
    MediaCategory["IMAGE"] = "image";
    MediaCategory["VIDEO"] = "video";
})(MediaCategory || (exports.MediaCategory = MediaCategory = {}));
;
// Kinds of trending data that can be fetched
var TrendingType;
(function (TrendingType) {
    TrendingType["LINKS"] = "links";
    TrendingType["SERVERS"] = "servers";
    TrendingType["STATUSES"] = "statuses";
    TrendingType["TAGS"] = "tags";
})(TrendingType || (exports.TrendingType = TrendingType = {}));
;
;
;
;
;
;
;
;
// TODO: unused stuff below here
// From https://dev.to/nikosanif/create-promises-with-timeout-error-in-typescript-fmm
function promiseWithTimeout(promise, milliseconds, timeoutError = new Error('Promise timed out')) {
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
//# sourceMappingURL=types.js.map