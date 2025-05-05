"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPrefix = exports.traceLog = exports.lockSemaphore = exports.lockMutex = exports.logAndThrowError = exports.logTootRemoval = exports.logDebug = exports.logInfo = exports.PREP_SCORERS = exports.TRIGGER_FEED = exports.CLEANUP_FEED = void 0;
const time_helpers_1 = require("../helpers/time_helpers");
const config_1 = require("../config");
const environment_helpers_1 = require("../helpers/environment_helpers");
const ENABLE_TRACE_LOG = environment_helpers_1.isDebugMode;
// Log prefixes
exports.CLEANUP_FEED = "cleanupFeed()";
exports.TRIGGER_FEED = "triggerFeedUpdate()";
exports.PREP_SCORERS = "prepareScorers()";
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
    const waitSeconds = (0, time_helpers_1.ageInSeconds)(startedAt);
    const logMsg = `${logPrefix} Mutex lock acquired ${(0, time_helpers_1.ageString)(startedAt)}`;
    if (waitSeconds > config_1.Config.mutexWarnSeconds) {
        console.warn(logMsg);
    }
    else if (waitSeconds > 2) {
        console.debug(logMsg);
    }
    return releaseMutex;
}
exports.lockMutex = lockMutex;
;
async function lockSemaphore(semaphore, logPrefix) {
    const startedAt = new Date();
    const release = await semaphore.acquire();
    const waitSeconds = (0, time_helpers_1.ageInSeconds)(startedAt);
    const logMsg = `${logPrefix} Semaphore ${release[0]} lock acquired ${(0, time_helpers_1.ageString)(startedAt)}`;
    if (waitSeconds > config_1.Config.mutexWarnSeconds) {
        console.warn(logMsg);
    }
    else if (waitSeconds > 2) {
        console.debug(logMsg);
    }
    return release;
}
exports.lockSemaphore = lockSemaphore;
;
// Log only if DEBUG env var is set.
// Assumes if there's multiple args and the 2nd one is a string the 1st one is a prefix.
function traceLog(msg, ...args) {
    if (!ENABLE_TRACE_LOG)
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
    return `${prefix} ${msg}`;
}
exports.addPrefix = addPrefix;
;
//# sourceMappingURL=log_helpers.js.map