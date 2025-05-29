"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceLog = exports.sizeOf = exports.logTootRemoval = exports.logTelemetry = exports.logAndThrowError = exports.lockExecution = exports.logInfo = exports.logDebug = exports.TRIGGER_FEED = exports.PREP_SCORERS = exports.CLEANUP_FEED = exports.BACKFILL_FEED = void 0;
const time_helpers_1 = require("../helpers/time_helpers");
const config_1 = require("../config");
const environment_helpers_1 = require("../helpers/environment_helpers");
const collection_helpers_1 = require("./collection_helpers");
const string_helpers_1 = require("./string_helpers");
// Log prefixes
exports.BACKFILL_FEED = "triggerHomeTimelineBackFill()";
exports.CLEANUP_FEED = "cleanupFeed()";
exports.PREP_SCORERS = "prepareScorers()";
exports.TRIGGER_FEED = "triggerFeedUpdate()";
// console.log methods with a prefix
const logDebug = (pfx, msg, ...args) => console.debug((0, string_helpers_1.prefixed)(pfx, msg), ...args);
exports.logDebug = logDebug;
const logInfo = (pfx, msg, ...args) => console.info((0, string_helpers_1.prefixed)(pfx, msg), ...args);
exports.logInfo = logInfo;
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
    if (waitSeconds > config_1.config.api.mutexWarnSeconds) {
        console.warn(logMsg);
    }
    else if (waitSeconds > 2) {
        traceLog(logMsg);
    }
    return releaseLock;
}
exports.lockExecution = lockExecution;
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
// Log a message with a telemetry timing suffix
function logTelemetry(logPrefix, msg, startedAt, ...args) {
    msg = `${string_helpers_1.TELEMETRY} ${msg} ${(0, time_helpers_1.ageString)(startedAt)}`;
    // If there's ...args and first arg is a string, assume it's a label for any other arg objects
    if (args.length && typeof args[0] == 'string') {
        msg += `, ${args.shift()}`;
    }
    (0, exports.logInfo)(logPrefix, msg, ...args);
}
exports.logTelemetry = logTelemetry;
;
// Simple log helper that only fires if numRemoved > 0
function logTootRemoval(prefix, tootType, numRemoved, numTotal) {
    if (numRemoved == 0)
        return;
    console.debug(`${(0, string_helpers_1.bracketed)(prefix)} Removed ${numRemoved} ${tootType} toots leaving ${numTotal} toots`);
}
exports.logTootRemoval = logTootRemoval;
;
// Not 100% accurate. From https://gist.github.com/rajinwonderland/36887887b8a8f12063f1d672e318e12e
function sizeOf(obj) {
    var bytes = 0;
    if (obj === null || obj === undefined)
        return bytes;
    switch (typeof obj) {
        case "number":
            bytes += 8;
            break;
        case "string":
            bytes += strBytes(obj);
            break;
        case "boolean":
            bytes += 4;
            break;
        case "function":
            // bytes += strBytes(obj.toString());  // functions aren't serialized in JSON i don't think?
            break;
        case "object":
            if (Array.isArray(obj)) {
                bytes += (0, collection_helpers_1.sumArray)(obj.map(sizeOf));
            }
            else {
                Object.entries(obj).forEach(([key, value]) => {
                    bytes += strBytes(key);
                    bytes += sizeOf(value);
                });
            }
            break;
        default:
            console.warn(`sizeOf() unknown type: ${typeof obj}`);
            bytes += strBytes(obj.toString());
            break;
    }
    return bytes;
}
exports.sizeOf = sizeOf;
;
// Log only if FEDIALGO_DEBUG env var is set to "true"
// Assumes if there's multiple args and the 2nd one is a string the 1st one is a prefix.
function traceLog(msg, ...args) {
    if (!environment_helpers_1.isDebugMode)
        return;
    if (args.length > 0) {
        if (typeof args[0] == 'string') {
            msg = (0, string_helpers_1.prefixed)(msg, args.shift());
        }
    }
    console.debug(msg, ...args);
}
exports.traceLog = traceLog;
;
// Roughly, assuming UTF-8 encoding. UTF-16 would be 2x this, emojis are 4 bytes, etc.
const strBytes = (str) => str.length;
//# sourceMappingURL=log_helpers.js.map