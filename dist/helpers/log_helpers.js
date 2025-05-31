"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentLogger = exports.WaitTime = exports.strBytes = exports.traceLog = exports.logTootRemoval = exports.logTelemetry = exports.logAndThrowError = exports.lockExecution = exports.TRIGGER_FEED = exports.PREP_SCORERS = exports.BACKFILL_FEED = void 0;
const time_helpers_1 = require("../helpers/time_helpers");
const config_1 = require("../config");
const environment_helpers_1 = require("../helpers/environment_helpers");
const string_helpers_1 = require("./string_helpers");
// Log prefixes
exports.BACKFILL_FEED = "triggerHomeTimelineBackFill()";
exports.PREP_SCORERS = "prepareScorers()";
exports.TRIGGER_FEED = "triggerFeedUpdate()";
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
    console.info((0, string_helpers_1.prefixed)(logPrefix, msg), ...args);
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
// Log lines with "[DEMO APP] <ComponentName>" prefixed
// TODO: Move to its own file
class ComponentLogger {
    componentName;
    logPrefix;
    subtitle;
    subsubtitle;
    constructor(componentName, subtitle, subsubtitle) {
        this.componentName = componentName;
        this.subtitle = subtitle;
        this.subsubtitle = subsubtitle;
        this.logPrefix = (0, string_helpers_1.bracketed)(componentName) + (subtitle ? ` <${subtitle}>` : "");
        this.logPrefix += (subsubtitle ? ` (${subsubtitle})` : "");
    }
    // If first arg is a string, check if 2nd arg is an Error and do some special formatting
    // Returns the error message in case it's of use.
    error(msg, ...args) {
        if (msg instanceof Error) {
            console.error(this.makeMsg(msg.message), ...args);
            return msg.message;
        }
        msg = this.getErrorMessage(msg, ...args);
        console.error(this.makeMsg(msg), ...args);
        return msg;
    }
    // Also checks the first argument for an Error but first arg must be a string
    warn(msg, ...args) {
        msg = this.getErrorMessage(msg, ...args);
        console.warn(this.makeMsg(msg), ...args);
    }
    log(msg, ...args) {
        console.log(this.makeMsg(msg), ...args);
    }
    info(msg, ...args) {
        console.info(this.makeMsg(msg), ...args);
    }
    debug(msg, ...args) {
        console.debug(this.makeMsg(msg), ...args);
    }
    // Only writes logs when FEDIALGO_DEBUG env var is set
    trace(msg, ...args) {
        environment_helpers_1.isDebugMode && this.debug(msg, ...args);
    }
    // Mutates args array to pop the first Error if it exists
    getErrorMessage(msg, ...args) {
        if (args[0] instanceof Error) {
            return this.makeErrorMsg(args.shift(), msg);
        }
        else {
            return msg;
        }
    }
    makeErrorMsg(error, msg) {
        return msg ? `${msg} (error.message="${error.message}")` : error.message;
    }
    makeMsg(msg) {
        return this.logPrefix + (0, string_helpers_1.isEmptyStr)(msg) ? '' : ` ${msg}`;
    }
}
exports.ComponentLogger = ComponentLogger;
;
//# sourceMappingURL=log_helpers.js.map