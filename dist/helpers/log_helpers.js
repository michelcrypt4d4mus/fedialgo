"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitTime = exports.strBytes = exports.traceLog = exports.logTootRemoval = exports.logAndThrowError = exports.lockExecution = exports.TRIGGER_FEED = exports.PREP_SCORERS = exports.BACKFILL_FEED = void 0;
const time_helpers_1 = require("../helpers/time_helpers");
const config_1 = require("../config");
const environment_helpers_1 = require("../helpers/environment_helpers");
const string_helpers_1 = require("./string_helpers");
// Log prefixes
exports.BACKFILL_FEED = "triggerHomeTimelineBackFill()";
exports.PREP_SCORERS = "prepareScorers()";
exports.TRIGGER_FEED = "triggerFeedUpdate()";
// Lock a Semaphore or Mutex and log the time it took to acquire the lock
async function lockExecution(locker, logger, logPrefix) {
    const startedAt = new Date();
    const acquireLock = await locker.acquire();
    const waitSeconds = (0, time_helpers_1.ageInSeconds)(startedAt);
    let releaseLock;
    let logMsg = logPrefix ? `${logPrefix} ` : '';
    if (Array.isArray(acquireLock)) {
        logMsg += `Semaphore ${acquireLock[0]}`;
        releaseLock = acquireLock[1];
    }
    else {
        logMsg += `Mutex`;
        releaseLock = acquireLock;
    }
    logMsg += ` lock acquired ${(0, time_helpers_1.ageString)(startedAt)}`;
    if (waitSeconds > config_1.config.api.mutexWarnSeconds) {
        logger.warn(logMsg);
    }
    else if (waitSeconds > 2) {
        logger.trace(logMsg);
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
// Simple log helper that only fires if numRemoved > 0 // TODO: move into Logger class
function logTootRemoval(logger, tootType, numRemoved, numTotal) {
    if (numRemoved == 0)
        return;
    logger.debug(`Removed ${numRemoved} ${tootType} toots leaving ${numTotal} toots`);
}
exports.logTootRemoval = logTootRemoval;
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
exports.strBytes = strBytes;
// Helper class for telemetry
class WaitTime {
    avgMsPerRequest = 0;
    milliseconds = 0;
    numRequests = 0;
    startedAt = new Date(); // TODO: this shouldn't really be set yet...
    ageString() {
        return (0, time_helpers_1.ageString)(this.startedAt);
    }
    markStart() {
        this.startedAt = new Date();
    }
    markEnd() {
        this.milliseconds += (0, time_helpers_1.ageInMS)(this.startedAt);
        this.numRequests++;
        this.avgMsPerRequest = this.milliseconds / this.numRequests;
    }
    toDict() {
        return {
            avgMsPerRequest: this.avgMsPerRequest,
            milliseconds: this.milliseconds,
            numRequests: this.numRequests
        };
    }
}
exports.WaitTime = WaitTime;
;
//# sourceMappingURL=log_helpers.js.map