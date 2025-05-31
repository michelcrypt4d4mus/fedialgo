"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentLogger = void 0;
/*
 * Standardized logger
 */
const string_helpers_1 = require("./string_helpers");
const environment_helpers_1 = require("./environment_helpers");
// Log lines with "[ComponentName] <Subtitle> (subsubtitle)" prefix
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
exports.ComponentLogger = ComponentLogger;
;
//# sourceMappingURL=logger.js.map