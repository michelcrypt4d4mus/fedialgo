"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefixed = exports.traceLog = exports.lockExecution = exports.logAndThrowError = exports.logTootRemoval = exports.logDebug = exports.logInfo = exports.PREP_SCORERS = exports.TRIGGER_FEED = exports.CLEANUP_FEED = void 0;
const time_helpers_1 = require("../helpers/time_helpers");
const string_helpers_1 = require("./string_helpers");
const config_1 = require("../config");
const environment_helpers_1 = require("../helpers/environment_helpers");
const ENABLE_TRACE_LOG = environment_helpers_1.isDebugMode;
// Log prefixes
exports.CLEANUP_FEED = "cleanupFeed()";
exports.TRIGGER_FEED = "triggerFeedUpdate()";
exports.PREP_SCORERS = "prepareScorers()";
// console.log methods with a prefix
const logInfo = (pfx, msg, ...args) => console.info(prefixed(pfx, msg), ...args);
exports.logInfo = logInfo;
const logDebug = (pfx, msg, ...args) => console.debug(prefixed(pfx, msg), ...args);
exports.logDebug = logDebug;
// Simple log helper that only fires if numRemoved > 0
function logTootRemoval(prefix, tootType, numRemoved, numTotal) {
    if (numRemoved == 0)
        return;
    console.debug(`${(0, string_helpers_1.bracketed)(prefix)} Removed ${numRemoved} ${tootType} toots leaving ${numTotal} toots`);
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
// Lock a Semaphore or Mutex and log the time it took to acquire the lock
async function lockExecution(locker, logPrefix) {
    const startedAt = new Date();
    const acquireLock = await locker.acquire();
    const waitSeconds = (0, time_helpers_1.ageInSeconds)(startedAt);
    let releaseLock;
    let logMsg = (0, string_helpers_1.bracketed)(logPrefix);
    if (Array.isArray(acquireLock)) {
        logMsg += ` Semaphore ${acquireLock[0]}`;
        releaseLock = acquireLock[1];
    }
    else {
        logMsg += ` Mutex`;
        releaseLock = acquireLock;
    }
    logMsg += ` lock acquired ${(0, time_helpers_1.ageString)(startedAt)}`;
    if (waitSeconds > config_1.Config.mutexWarnSeconds) {
        console.warn(logMsg);
    }
    else if (waitSeconds > 2) {
        console.debug(logMsg);
    }
    return releaseLock;
}
exports.lockExecution = lockExecution;
;
// Log only if DEBUG env var is set.
// Assumes if there's multiple args and the 2nd one is a string the 1st one is a prefix.
function traceLog(msg, ...args) {
    if (!ENABLE_TRACE_LOG)
        return;
    if (args.length > 0) {
        if (typeof args[0] == 'string') {
            msg = prefixed(msg, args.shift());
        }
    }
    console.debug(msg, ...args);
}
exports.traceLog = traceLog;
;
// Prefix a string with [Brackets] and a space
function prefixed(prefix, msg) {
    return `${(0, string_helpers_1.bracketed)(prefix)} ${msg}`;
}
exports.prefixed = prefixed;
;
//# sourceMappingURL=log_helpers.js.map