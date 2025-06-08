"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
/*
 * Standardized logger.
 */
const time_helpers_1 = require("./time_helpers");
const environment_helpers_1 = require("./environment_helpers");
const collection_helpers_1 = require("./collection_helpers");
const string_helpers_1 = require("./string_helpers");
const PREFIXERS = [
    string_helpers_1.bracketed,
    string_helpers_1.arrowed,
    (str) => `{${str}}`,
    (str) => `(${str})`,
    (str) => `|${str}|`,
    (str) => `=${str}=`,
    (str) => `*${str}*`,
    (str) => `~${str}~`,
    (str) => `-${str}-`,
    (str) => `#${str}#`,
];
// Log lines with "[ComponentName] <Subtitle> (subsubtitle)" prefix
class Logger {
    logPrefix;
    prefixes;
    constructor(name, ...args) {
        this.prefixes = [name, ...args.filter(arg => typeof arg == 'string')];
        this.logPrefix = this.prefixes.map((str, i) => PREFIXERS[i] ? PREFIXERS[i](str) : str).join(' ');
        if (this.prefixes.length > PREFIXERS.length) {
            this.warn(`Logger created with too many prefixes: ${this.prefixes}`);
        }
    }
    // Alternate constructor; makes the first two arguments into a parenthesized bracketed string
    // e.g. Logger("ComponentName", "domain") -> "[ComponentName<domain>] "
    static withParenthesizedName(name, parenthesized, ...args) {
        return new Logger(`${name} ${(0, string_helpers_1.arrowed)(parenthesized)}`, ...args);
    }
    // If first arg is a string, check if 2nd arg is an Error and do some special formatting
    // Returns the error message in case it's of use.
    error(msg, ...args) {
        if (msg instanceof Error) {
            console.error(this.line(msg.message), ...args);
            return msg.message;
        }
        msg = this.errorStr(msg, ...args);
        console.error(this.line(msg), ...args);
        return msg;
    }
    // warn() also checks the first argument for an Error but first arg must be a string
    warn = (msg, ...args) => console.warn(this.line(this.errorStr(msg, ...args)), ...args);
    log = (msg, ...args) => console.log(this.line(msg), ...args);
    info = (msg, ...args) => console.info(this.line(msg), ...args);
    debug = (msg, ...args) => console.debug(this.line(msg), ...args);
    trace = (msg, ...args) => { (environment_helpers_1.isDebugMode || environment_helpers_1.isDeepDebug) && this.debug(msg, ...args); };
    deep = (msg, ...args) => { environment_helpers_1.isDeepDebug && this.debug(msg, ...args); };
    // Not a real warning, just a log with a warning prefix in colored text
    warnWithoutTrace = (msg, ...args) => console.log(`%cWarning: ${msg}`, 'color: orange;');
    // Concatenate prefix and strings
    line(msg) {
        return this.logPrefix + ((0, string_helpers_1.isEmptyStr)(msg) ? '' : ` ${msg}`);
    }
    // Log an error message and throw an Error with the stringified args and the message.
    logAndThrowError(msg, ...args) {
        console.error(msg, args);
        if (args.length > 0) {
            const [errorArgs, otherArgs] = (0, collection_helpers_1.split)(args, arg => arg instanceof Error);
            if (errorArgs.length > 0) {
                msg = this.makeErrorMsg(errorArgs[0], msg);
            }
            if (otherArgs.length > 0) {
                msg += [`, additional args:`, ...args.map(arg => JSON.stringify(arg, null, 4))].join(`\n`);
            }
        }
        throw new Error(this.line(msg));
    }
    // Log the fact that an array was reduced in size.
    logArrayReduction(before, after, objType, reason) {
        const numRemoved = before.length - after.length;
        if (numRemoved == 0)
            return;
        this.trace(`Removed ${numRemoved} ${reason ? (reason + " ") : ""}${objType}s leaving ${after.length}`);
    }
    // Log a message with the amount of time from startedAt to now.
    logTelemetry(msg, startedAt, ...args) {
        msg = `${string_helpers_1.TELEMETRY} ${msg} ${(0, time_helpers_1.ageString)(startedAt)}`;
        // If there's ...args and first arg is a string, assume it's a label for any other arg objects
        if (args.length && typeof args[0] == 'string') {
            msg += `, ${args.shift()}`;
        }
        this.info(msg, ...args);
    }
    // Add a random string to the prefix. Can be helpful when there's a lot of threads w/same prefix.
    tagWithRandomString() {
        this.logPrefix += ` *#(${(0, string_helpers_1.createRandomString)(4)})#*`;
    }
    // Returns new Logger with one additional prefix.
    tempLogger(arg1, ...args) {
        const tempArgs = [...this.prefixes, arg1, ...args];
        return new Logger(tempArgs[0], ...tempArgs.slice(1));
    }
    // Mutates args array to pop the first Error if it exists
    errorStr(msg, ...args) {
        if (args[0] instanceof Error) {
            return this.makeErrorMsg(args.shift(), msg);
        }
        else {
            return msg;
        }
    }
    // Make a custom error message
    makeErrorMsg(error, msg) {
        return msg ? `${msg} (error.message="${error.message}")` : error.message;
    }
    // Returns a function that will build Logger objects with the starting prefixes
    static logBuilder(name, ...prefixes) {
        // I think we have to define as const before returning to get the closure to capture the name + prefixes?
        const logMaker = (...args) => new Logger(name, ...[...prefixes, ...args]);
        return logMaker;
    }
}
exports.Logger = Logger;
;
//# sourceMappingURL=logger.js.map