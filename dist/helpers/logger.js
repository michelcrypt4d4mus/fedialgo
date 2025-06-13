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
/**
 * Standardized logger for consistent, prefixed, and optionally colorized logging throughout the application.
 * Supports multiple log levels, custom prefixes, telemetry, and error handling utilities.
 *
 * @class
 * @property {string} logPrefix - The formatted prefix for all log messages from this logger.
 * @property {string[]} prefixes - The list of prefix strings used to build the logPrefix.
 */
class Logger {
    logPrefix;
    prefixes;
    /**
     * Constructs a Logger instance with the given name and optional additional prefixes.
     * @param {string} name - The main name or component for the logger prefix.
     * @param {...(string|boolean|null|undefined)} args - Additional prefix arguments.
     */
    constructor(name, ...args) {
        this.prefixes = [name, ...args.filter(arg => typeof arg == 'string')];
        this.logPrefix = this.prefixes.map((str, i) => PREFIXERS[i] ? PREFIXERS[i](str) : str).join(' ');
        if (this.prefixes.length > PREFIXERS.length) {
            this.warn(`Logger created with too many prefixes: ${this.prefixes}`);
        }
    }
    /**
     * Alternate constructor; makes the first two arguments into a parenthesized bracketed string.
     * e.g. the prefix will be [name (parenthesized)].
     * @param {string} name - The main name for the logger.
     * @param {string} parenthesized - The value to parenthesize in the prefix.
     * @param {...string} args - Additional prefix arguments.
     * @returns {Logger} A new Logger instance with the custom prefix.
     */
    static withParenthesizedName(name, parenthesized, ...args) {
        return new Logger(`${name} ${(0, string_helpers_1.arrowed)(parenthesized)}`, ...args);
    }
    /**
     * Logs an error message or Error object to the console with the logger's prefix.
     * Checks whether any element of 'args' is an instance of Error for special handling.
     * @param {string|Error} msg - The error message or Error object.
     * @param {...any} args - Additional arguments to log.
     * @returns {string} The error message string.
     */
    error(msg, ...args) {
        const allArgs = [msg, ...args];
        msg = this.errorStr(...allArgs);
        console.error(this.line(msg), ...allArgs);
        return msg;
    }
    /**
     * Call console.warn() with the logger's prefix. Checks for Error objs in args in the same way as `error()`.
     * @param {string} msg - The warning message.
     * @param {...any} args - Additional arguments to log.
     */
    warn = (msg, ...args) => console.warn(this.line(this.errorStr(...[msg, ...args])));
    /** console.log() with the logger's prefix. */
    log = (msg, ...args) => console.log(this.line(msg), ...args);
    /** console.info() with the logger's prefix. */
    info = (msg, ...args) => console.info(this.line(msg), ...args);
    /** console.debug() with the logger's prefix. */
    debug = (msg, ...args) => console.debug(this.line(msg), ...args);
    /** Calls 'debug()' to log but only if FEDIALGO_DEBUG env var is set. */
    trace = (msg, ...args) => { (environment_helpers_1.isDebugMode || environment_helpers_1.isDeepDebug) && this.debug(msg, ...args); };
    /** Calls 'debug()' to log but only if FEDIALGO_DEEP_DEBUG env var is set. */
    deep = (msg, ...args) => { environment_helpers_1.isDeepDebug && this.debug(msg, ...args); };
    /** Logs a warning message with a warn colored prefix (not a real warning level). */
    warnWithoutTrace = (msg, ...args) => console.log(`%cWarning: ${msg}`, 'color: orange;', args);
    /**
     * Concatenates the logger's prefix and the given message.
     * @param {string|undefined} msg - The message to prefix.
     * @returns {string} The prefixed log line.
     */
    line(msg) {
        return this.logPrefix + ((0, string_helpers_1.isEmptyStr)(msg) ? '' : ` ${msg}`);
    }
    /**
     * Logs an error message and throws an Error with the stringified arguments and message.
     * @param {string} msg - The error message.
     * @param {...any} args - Additional arguments to include in the error.
     * @throws {Error} A new Error with the formatted message, optionally including the first Error argument.
     */
    logAndThrowError(msg, ...args) {
        console.error(msg, ...args);
        const errorArgs = this.findErrorArg(args);
        if (errorArgs.args.length > 0) {
            msg += [`, additional args:`, ...args.map(arg => JSON.stringify(arg, null, 4))].join(`\n`);
        }
        msg = this.line(msg);
        throw errorArgs.error ? new Error(msg, { cause: errorArgs.error }) : new Error(msg);
    }
    /**
     * Logs the reduction in size of an array (e.g., after filtering or deduplication).
     * @param {T[]} before - The array before reduction.
     * @param {T[]} after - The array after reduction.
     * @param {string} objType - The type of object in the array.
     * @param {string} [reason] - Optional reason for reduction.
     */
    logArrayReduction(before, after, objType, reason) {
        const numRemoved = before.length - after.length;
        if (numRemoved == 0)
            return;
        this.trace(`Removed ${numRemoved}${(0, string_helpers_1.optionalSuffix)(reason)} ${objType}s leaving ${after.length}`);
    }
    /**
     * Logs a sorted dictionary of string-number pairs.
     * @param {string} msg - The message to log before the dictionary.
     * @param {StringNumberDict} dict - The dictionary to log.
     */
    logSortedDict(msg, dict) {
        const sortedKeys = (0, collection_helpers_1.sortKeysByValue)(dict);
        this.debug(`${msg}:\n${sortedKeys.map((k, i) => `  ${i + 1}: ${k} (${dict[k]})`).join('\n')}`);
    }
    /**
     * Logs a message with the elapsed time since startedAt, optionally with additional labels/args.
     * @param {string} msg - The message to log.
     * @param {Date} startedAt - The start time to compute elapsed time.
     * @param {...any} args - Additional arguments or labels.
     */
    logTelemetry(msg, startedAt, ...args) {
        msg = `${string_helpers_1.TELEMETRY} ${msg} ${(0, time_helpers_1.ageString)(startedAt)}`;
        // If there's ...args and first arg is a string, assume it's a label for any other arg objects
        if (args.length && typeof args[0] == 'string') {
            msg += `, ${args.shift()}`;
        }
        this.info(msg, ...args);
    }
    /**
     * Adds a random string to the logger's prefix (useful for distinguishing logs in concurrent contexts).
     */
    tagWithRandomString() {
        this.logPrefix += ` *#(${(0, string_helpers_1.createRandomString)(4)})#*`;
    }
    /**
     * Returns a new Logger with additional prefix arguments appended to this.prefixes.
     * @param {string} arg1 - The additional prefix.
     * @param {...LoggerArg} args - More prefix arguments.
     * @returns {Logger} A new Logger instance with the extended prefix.
     */
    tempLogger(arg1, ...args) {
        const tempArgs = [...this.prefixes, arg1, ...args];
        return new Logger(tempArgs[0], ...tempArgs.slice(1));
    }
    /**
     * Mutates args array to pop the first Error if it exists.
     * @private
     * @param {string} msg - The error message.
     * @param {...any} args - Additional arguments.
     * @returns {string} The formatted error message.
     */
    errorStr(...args) {
        const errorArgs = this.findErrorArg(args);
        const stringArgs = errorArgs.args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg, null, 4));
        const stringArg = stringArgs.length > 0 ? stringArgs.join(', ') : undefined;
        if (errorArgs.error) {
            return this.makeErrorMsg(errorArgs.error, stringArg);
        }
        else {
            if (!stringArg)
                this.warn(`errorStr() called with no string or error args, returning empty string`);
            return stringArg || '';
        }
    }
    /**
     * Separate the Error type args from the rest of the args.
     * @private
     * @param {...any} args - Additional arguments.
     * @returns {ErrorArgs} Object with `args` containing non-Error args and `error` if an Error was found.
     */
    findErrorArg(args) {
        const [errorArgs, otherArgs] = (0, collection_helpers_1.split)(args, arg => arg instanceof Error);
        if (errorArgs.length > 0) {
            if (errorArgs.length > 1) {
                this.warn(`findErrorArg() called with multiple Error args, only using the first one:`, errorArgs);
            }
            return { args: otherArgs, error: errorArgs[0] };
        }
        else {
            return { args: otherArgs };
        }
    }
    /**
     * Make a custom error message.
     * @private
     * @param {Error} error - The error object.
     * @param {string} [msg] - Optional additional message.
     * @returns {string} The formatted error message.
     */
    makeErrorMsg(error, msg) {
        return msg ? `${msg} (error.message="${error.message}")` : error.message;
    }
    /**
     * Returns a function that builds Logger objects with the starting prefixes.
     * @param {string} name - The main name for the logger.
     * @param {...LoggerArg} prefixes - Additional prefixes.
     * @returns {(args: LoggerArg[]) => Logger} A function that creates Logger instances with the given prefixes.
     */
    static logBuilder(name, ...prefixes) {
        // I think we have to define as const before returning to get the closure to capture the name + prefixes?
        const logMaker = (...args) => new Logger(name, ...[...prefixes, ...args]);
        return logMaker;
    }
}
exports.Logger = Logger;
;
//# sourceMappingURL=logger.js.map