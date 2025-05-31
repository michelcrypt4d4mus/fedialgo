"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
/*
 * Standardized logger
 */
const time_helpers_1 = require("./time_helpers");
const environment_helpers_1 = require("./environment_helpers");
const string_helpers_1 = require("./string_helpers");
// Log lines with "[ComponentName] <Subtitle> (subsubtitle)" prefix
class Logger {
    componentName;
    logPrefix;
    subtitle;
    subsubtitle;
    subsubsubtitle;
    // TODO: just use an array
    constructor(componentName, subtitle, subsubtitle, subsubsubtitle) {
        this.componentName = componentName;
        this.subtitle = subtitle;
        this.subsubtitle = subsubtitle;
        this.subsubsubtitle = subsubsubtitle;
        this.logPrefix = (0, string_helpers_1.bracketed)(componentName) + (subtitle ? ` <${subtitle}>` : "");
        this.logPrefix += (subsubtitle ? ` (${subsubtitle})` : "");
        this.logPrefix += (subsubsubtitle ? ` -${subsubsubtitle}-` : "");
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
    logTelemetry(msg, startedAt, ...args) {
        msg = `${string_helpers_1.TELEMETRY} ${msg} ${(0, time_helpers_1.ageString)(startedAt)}`;
        // If there's ...args and first arg is a string, assume it's a label for any other arg objects
        if (args.length && typeof args[0] == 'string') {
            msg += `, ${args.shift()}`;
        }
        this.info(msg, ...args);
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
    // Fill in first available prefix slot with string
    tempLogger(prefix) {
        if (!this.subtitle) {
            return new Logger(this.componentName, prefix);
        }
        else if (!this.subsubtitle) {
            return new Logger(this.componentName, this.subtitle, prefix);
        }
        else if (!this.subsubsubtitle) {
            return new Logger(this.componentName, this.subtitle, this.subsubtitle, prefix);
        }
        else {
            this.error(`tempLogger() called on logger with all prefix slots filled with prefix="${prefix}"`);
            return this;
        }
    }
    // Can be helpful when there's a lot of threads and you want to distinguish them
    tagWithRandomString() {
        this.logPrefix += ` *#(${(0, string_helpers_1.createRandomString)(4)})#*`;
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
        return this.logPrefix + ((0, string_helpers_1.isEmptyStr)(msg) ? '' : ` ${msg}`);
    }
}
exports.Logger = Logger;
;
//# sourceMappingURL=logger.js.map