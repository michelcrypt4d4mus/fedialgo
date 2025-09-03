import { type OptionalString, type StringNumberDict } from '../types';
type LoggerArg = OptionalString | boolean;
/**
 * Standardized logger for consistent, prefixed, and optionally colorized logging throughout the application.
 * Supports multiple log levels, custom prefixes, telemetry, and error handling utilities.
 *
 * @class
 * @property {string} logPrefix - The formatted prefix for all log messages from this logger.
 * @property {string[]} prefixes - The list of prefix strings used to build the logPrefix.
 */
export declare class Logger {
    logPrefix: string;
    private prefixes;
    /**
     * Constructs a Logger instance with the given name and optional additional prefixes.
     * @param {string} name - The main name or component for the logger prefix.
     * @param {...(string|boolean|null|undefined)} args - Additional prefix arguments.
     */
    constructor(name: string, ...args: LoggerArg[]);
    /**
     * Alternate constructor; makes the first two arguments into a parenthesized bracketed string.
     * e.g. the prefix will be [name (parenthesized)].
     * @param {string} name - The main name for the logger.
     * @param {string} parenthesized - The value to parenthesize in the prefix.
     * @param {...string} args - Additional prefix arguments.
     * @returns {Logger} A new Logger instance with the custom prefix.
     */
    static withParenthesizedName(name: string, parenthesized: string, ...args: string[]): Logger;
    /**
     * Logs an error message or Error object to the console with the logger's prefix.
     * Checks whether any element of 'args' is an instance of Error for special handling.
     * @param {string|Error} msg - The error message or Error object.
     * @param {...unknown} args - Additional arguments to log.
     * @returns {string} The error message string.
     */
    error(msg: string | Error, ...args: unknown[]): string;
    /**
     * Call console.warn() with the logger's prefix. Checks for Error objs in args in the same way as `error()`.
     * @param {string} msg - The warning message.
     * @param {...unknown} args - Additional arguments to log.
     */
    warn: (msg: string, ...args: unknown[]) => void;
    /** console.log() with the logger's prefix. */
    log: (msg: string, ...args: unknown[]) => void;
    /** console.info() with the logger's prefix. */
    info: (msg: string, ...args: unknown[]) => void;
    /** console.debug() with the logger's prefix. */
    debug: (msg: string, ...args: unknown[]) => void;
    /** Logs 'msg' at debug level but only appends 'args' if isDebugMode is true. */
    debugWithTraceObjs: (msg: string, ...args: unknown[]) => void;
    /** Calls 'debug()' to log but only if FEDIALGO_DEBUG env var is set. */
    trace: (msg: string, ...args: unknown[]) => void;
    /** Calls 'debug()' to log but only if FEDIALGO_DEEP_DEBUG env var is set. */
    deep: (msg: string, ...args: unknown[]) => void;
    /** Logs a warning message with a warn colored prefix (not a real warning level). */
    warnWithoutTrace: (msg: string, ...args: unknown[]) => void;
    /**
     * Concatenates the logger's prefix and the given message.
     * @param {string|undefined} msg - The message to prefix.
     * @returns {string} The prefixed log line.
     */
    line(msg: string | undefined): string;
    /**
     * Logs an error message and throws an Error with the stringified arguments and message.
     * @param {string} msg - The error message.
     * @param {...unknown} args - Additional arguments to include in the error.
     * @throws {Error} A new Error with the formatted message, optionally including the first Error argument.
     */
    logAndThrowError(msg: string, ...args: unknown[]): never;
    /**
     * Logs the reduction in size of an array (e.g., after filtering or deduplication).
     * @param {T[]} before - The array before reduction.
     * @param {T[]} after - The array after reduction.
     * @param {string} objType - The type of object in the array.
     * @param {string} [reason] - Optional reason for reduction.
     */
    logArrayReduction<T>(before: T[], after: T[], objType: string, reason?: string): void;
    /**
     * Logs a sorted dictionary of string-number pairs.
     * @param {string} msg - The message to log before the dictionary.
     * @param {StringNumberDict} dict - The dictionary to log.
     */
    logSortedDict(msg: string, dict: StringNumberDict): void;
    /**
     * Log a message with stringified properties ('propX="somestring", propY=5', etc.) from an object.
     * @param {string} msg
     * @param {Record<string, Date | OptionalString | boolean | number>} obj
     */
    logStringifiedProps(msg: string, obj: Record<string, Date | OptionalString | boolean | number>): void;
    /**
     * Logs a message with the elapsed time since startedAt, optionally with additional labels/args.
     * @param {string} msg - The message to log.
     * @param {Date} [startedAt] - The start time to compute elapsed time.
     * @param {...unknown} args - Additional arguments or labels.
     */
    logTelemetry(msg: string, startedAt?: Date, ...args: unknown[]): void;
    /**
     * Adds a random string to the logger's prefix (useful for distinguishing logs in concurrent contexts).
     */
    tagWithRandomString(): void;
    /**
     * Returns a new Logger with additional prefix arguments appended to this.prefixes.
     * @param {string} arg1 - The additional prefix.
     * @param {...LoggerArg} args - More prefix arguments.
     * @returns {Logger} A new Logger instance with the extended prefix.
     */
    tempLogger(arg1: string, ...args: LoggerArg[]): Logger;
    /**
     * Mutates args array to pop the first Error if it exists.
     * @private
     * @param {...unknown} args - Additional arguments.
     * @returns {string} The formatted error message.
     */
    private errorStr;
    /**
     * Separate the Error type args from the rest of the args.
     * @private
     * @param {...unknown} args - Additional arguments.
     * @returns {ErrorArgs} Object with `args` containing non-Error args and `error` if an Error was found.
     */
    private findErrorArg;
    /**
     * Make a custom error message.
     * @private
     * @param {Error} error - The error object.
     * @param {string} [msg] - Optional additional message.
     * @returns {string} The formatted error message.
     */
    private makeErrorMsg;
    /**
     * Builds a dictionary of Logger instances keyed by the values of a string enum.
     * @template E - The enum type.
     * @template T - The type of the enum object.
     * @param {T} strEnum The enum that will key the loggers.
     * @returns {Record<E, Logger>} Dict of Logger instances keyed by the enum values.
     */
    static buildEnumLoggers<E extends string, T extends Record<string, E>>(strEnum: T): Record<E, Logger>;
    /**
     * Returns a function that builds Logger objects with the starting prefixes.
     * @param {string} name - The main name for the logger.
     * @param {...LoggerArg} prefixes - Additional prefixes.
     * @returns {(args: LoggerArg[]) => Logger} A function that creates Logger instances with the given prefixes.
     */
    static logBuilder(name: string, ...prefixes: LoggerArg[]): ((...args: LoggerArg[]) => Logger);
}
export {};
