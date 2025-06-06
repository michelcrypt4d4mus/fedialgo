"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILTER_OPTION_DATA_SOURCES = void 0;
const enums_1 = require("./enums");
// Filters
// These server as both Both filter option property names as well as demo app gradient config keys
exports.FILTER_OPTION_DATA_SOURCES = [
    ...Object.values(enums_1.TagTootsCacheKey),
    enums_1.BooleanFilterName.LANGUAGE,
    enums_1.ScoreName.FAVOURITED_ACCOUNTS,
];
;
;
;
;
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