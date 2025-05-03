"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMutexWaitTime = exports.logAndThrowError = exports.logTootRemoval = exports.logDebug = exports.logInfo = void 0;
/*
 * Logging related methods.
 */
const Storage_1 = __importDefault(require("../Storage"));
const string_helpers_1 = require("./string_helpers");
const time_helpers_1 = require("../helpers/time_helpers");
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
function checkMutexWaitTime(waitStartedAt, logPrefix) {
    if ((0, time_helpers_1.ageInSeconds)(waitStartedAt) > Storage_1.default.getConfig().mutexWarnSeconds) {
        console.warn(`${logPrefix} Mutex ${(0, time_helpers_1.inSeconds)(waitStartedAt)}!`);
    }
}
exports.checkMutexWaitTime = checkMutexWaitTime;
;
//# sourceMappingURL=log_helpers.js.map