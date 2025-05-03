"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPrefix = exports.traceLog = exports.lockMutex = exports.logAndThrowError = exports.logTootRemoval = exports.logDebug = exports.logInfo = void 0;
const Storage_1 = __importDefault(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
const environment_helpers_1 = require("../helpers/environment_helpers");
const TRACE_LOG = (0, environment_helpers_1.isDebugMode)();
// console.info() with a prefix
const logInfo = (prefix, msg, ...args) => {
    console.info(addPrefix(prefix, msg), ...args);
};
exports.logInfo = logInfo;
// console.info() with a prefix
const logDebug = (prefix, msg, ...args) => {
    console.debug(addPrefix(prefix, msg), ...args);
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
async function lockMutex(mutex, logPrefix) {
    const startedAt = new Date();
    const releaseMutex = await mutex.acquire();
    if ((0, time_helpers_1.ageInSeconds)(startedAt) > Storage_1.default.getConfig().mutexWarnSeconds) {
        console.warn(`${logPrefix} Mutex ${(0, time_helpers_1.inSeconds)(startedAt)}!`);
    }
    return releaseMutex;
}
exports.lockMutex = lockMutex;
;
// Log only if DEBUG env var is set.
// Assumes if there's multiple args and the 2nd one is a string the 1st one is a prefix.
function traceLog(msg, ...args) {
    if (!TRACE_LOG)
        return;
    if (args.length > 0) {
        if (typeof args[0] == 'string') {
            msg = addPrefix(msg, args.shift());
        }
    }
    console.debug(msg, ...args);
}
exports.traceLog = traceLog;
;
// Prefix a string with [Brackets] and a space
function addPrefix(prefix, msg) {
    prefix = prefix.startsWith("[") ? prefix : `[${prefix}]`;
    return `[${prefix}] ${msg}`;
}
exports.addPrefix = addPrefix;
;
//# sourceMappingURL=log_helpers.js.map