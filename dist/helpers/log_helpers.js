"use strict";
/*
 * Logging related methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAndThrowError = exports.logTootRemoval = exports.logDebug = exports.logInfo = void 0;
const string_helpers_1 = require("./string_helpers");
// console.info() with a prefix
const logInfo = (prefix, msg, ...args) => {
    console.info((0, string_helpers_1.addPrefix)(prefix, msg), ...args);
};
exports.logInfo = logInfo;
// console.info() with a prefix
const logDebug = (prefix, msg, ...args) => {
    console.debug((0, string_helpers_1.addPrefix)(prefix, msg), ...args);
};
exports.logDebug = logDebug;
// Doesn't work?
// export function fxnName(): string {
//     return fxnName.caller.name;
// };
// Simple log helper that only fires if numRemoved > 0
function logTootRemoval(prefix, tootType, numRemoved, numTotal) {
    if (numRemoved == 0)
        return;
    console.debug(`[${prefix}] Removed ${numRemoved} ${tootType} toots leaving ${numTotal} toots`);
}
exports.logTootRemoval = logTootRemoval;
;
// Log an error message and throw an Error
function logAndThrowError(message, obj) {
    if (obj) {
        console.error(message, obj);
        message += `\n${JSON.stringify(obj, null, 4)}`;
    }
    else {
        console.error(message);
    }
    throw new Error(message);
}
exports.logAndThrowError = logAndThrowError;
;
//# sourceMappingURL=log_helpers.js.map