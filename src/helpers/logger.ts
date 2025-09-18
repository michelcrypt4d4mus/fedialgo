/**
 * @fileoverview FediAlgo logger.
 */
import { isNil, isNull } from 'lodash';

import { ageString, quotedISOFmt } from './time_helpers';
import { isDebugMode, isDeepDebug } from './environment_helpers';
import { sortKeysByValue, split } from './collection_helpers';
import { TELEMETRY, arrowed, bracketed, createRandomString, isEmptyStr, optionalSuffix, quoted } from './string_helpers';
import { type OptionalString, type StringNumberDict } from '../types';

type ErrorArgs = {args: unknown[], error?: Error};
type LoggerArg = OptionalString | boolean;  // boolean so we can filter out optional args that are falsey

const TRACE_MSG = '[objs only logged in debug mode]';

const PREFIXERS = [
    bracketed,
    arrowed,
    (str: string) => `{${str}}`,
    (str: string) => `(${str})`,
    (str: string) => `|${str}|`,
    (str: string) => `=${str}=`,
    (str: string) => `*${str}*`,
    (str: string) => `~${str}~`,
    (str: string) => `-${str}-`,
    (str: string) => `#${str}#`,
] as const;


/**
 * Standardized logger for consistent, prefixed, and optionally colorized logging throughout
 * FediAlgo. Supports multiple log levels, custom prefixes, telemetry, and error handling utilities.
 * @class
 * @property {string} logPrefix - The formatted prefix for all log messages from this logger.
 * @property {string[]} prefixes - The list of prefix strings used to build the logPrefix.
 */
export class Logger {
    logPrefix: string;
    private prefixes: string[];

    /**
     * Constructs a {@linkcode Logger} instance with the given name and optional additional prefixes.
     * @param {string} name - The main name or component for the logger prefix.
     * @param {...(string|boolean|null|undefined)} args - Additional prefix arguments.
     */
    constructor(name: string, ...args: LoggerArg[]) {
        this.prefixes = [name, ...(args.filter(arg => typeof arg == 'string') as string[])];
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
     * @example Logger.withParenthesizedName('Type', 'paren', 'xyz').log('Hello');  // Logs "[Type (paren)] {xyz} Hello"
     */
    static withParenthesizedName(name: string, parenthesized: string, ...args: string[]): Logger {
        return new Logger(`${name} ${arrowed(parenthesized)}`, ...args)
    }

    /**
     * Logs an error message or {@linkcode Error} object to the console with the logger's prefix.
     * Checks whether any element of {@linkcode args} is an instance of {@linkcode Error} for
     * special handling.
     * @param {string|Error} msg - The error message or Error object.
     * @param {...unknown} args - Additional arguments to log.
     * @returns {string} The error message string.
     */
    error(msg: string | Error, ...args: unknown[]): string {
        this.debug(`Logging error msg="${msg}", args=`, args);
        const allArgs = [msg, ...args];
        msg = this.errorStr(...allArgs);
        console.error(this.line(msg), ...allArgs);
        return msg;
    }

    /**
     * Call {@linkcode console.warn()} with the logger's prefix. Checks for {@linkcode Error} objs in
     * {@linkcode args} in the same way as {@linkcode Logger.error}.
     * @param {string} msg - The warning message.
     * @param {...unknown} args - Additional arguments to log.
     */
    warn =  (msg: string, ...args: unknown[]) => console.warn(this.line(this.errorStr(...[msg, ...args])));
    /** {@linkcode console.log()} with the logger's prefix. */
    log =   (msg: string, ...args: unknown[]) => console.log(this.line(msg), ...args);
    /** {@linkcode console.info()} with the logger's prefix. */
    info =  (msg: string, ...args: unknown[]) => console.info(this.line(msg), ...args);
    /** {@linkcode console.debug()} with the logger's prefix. */
    debug = (msg: string, ...args: unknown[]) => console.debug(this.line(msg), ...args);
    /** Logs {@linkcode msg} at debug level but only appends {@linkcode args} if {@linkcode isDebugMode}. */
    debugWithTraceObjs = (msg: string, ...args: unknown[]) => {this.debug(msg, ...(isDebugMode ? args : [TRACE_MSG]))};
    /** Calls {@linkcode Logger.debug} to log but only if {@linkcode isDebugMode}. */
    trace = (msg: string, ...args: unknown[]) => {isDebugMode && this.debug(msg, ...args)};
    /** Calls {@linkcode Logger.debug} to log but only if {@linkcode isDeepDebug}. */
    deep =  (msg: string, ...args: unknown[]) => {isDeepDebug && this.debug(msg, ...args)};
    /** Logs a warning message with a warning colored prefix (not a real warning level). */
    warnWithoutTrace = (msg: string, ...args: unknown[]) => console.log(`%cWarning: ${msg}`, 'color: orange;', args);

    /**
     * Concatenates {@linkcode this.logPrefix} and the given {@linkcode msg}.
     * @param {string|undefined} msg - The message to prefix.
     * @returns {string} The prefixed log line.
     */
    line(msg: string | undefined): string {
        return this.logPrefix + (isEmptyStr(msg) ? '' : ` ${msg}`);
    }

    /**
     * Logs an error message and throws an {@linkcode Error} with the stringified arguments and message.
     * @param {string} msg - The error message.
     * @param {...unknown} args - Additional arguments to include in the error.
     * @throws {Error} A new Error with the formatted message, optionally including the first Error argument.
     */
    logAndThrowError(msg: string, ...args: unknown[]): never {
        console.error(msg, ...args);
        const errorArgs = this.findErrorArg(args);

        if (errorArgs.args.length > 0) {
            msg += [`, additional args:`, ...args.map(arg => JSON.stringify(arg, null, 4))].join(`\n`);
        }

        msg = this.line(msg);
        throw errorArgs.error ? new Error(msg, {cause: errorArgs.error}) : new Error(msg);
    }

    /**
     * Logs the reduction in size of an array (e.g. after filtering or deduplication).
     * @param {T[]} before - The array before reduction.
     * @param {T[]} after - The array after reduction.
     * @param {string} objType - The type of object in the array.
     * @param {string} [reason] - Optional reason for reduction.
     */
    logArrayReduction<T>(before: T[], after: T[], objType: string, reason?: string): void {
        const numRemoved = before.length - after.length;
        if (numRemoved == 0) return;
        this.trace(`Removed ${numRemoved} ${objType}s${optionalSuffix(reason)} leaving ${after.length}`);
    }

    /**
     * Logs a sorted dictionary of string-number pairs.
     * @param {string} msg - The message to log before the dictionary.
     * @param {StringNumberDict} dict - The dictionary to log.
     */
    logSortedDict(msg: string, dict: StringNumberDict): void {
        const sortedKeys = sortKeysByValue(dict);
        this.debug(`${msg}:\n${sortedKeys.map((k, i) => `  ${i + 1}: ${k} (${dict[k]})`).join('\n')}`);
    }

    /**
     * Log a message with stringified properties from an object.
     * @param {string} msg
     * @param {Record<string, Date | OptionalString | boolean | number>} obj
     * @example logWithStringifiedProps('End', {a: 'a', count: 5})  // Logs: 'End: a="a", count=5'
     */
    logStringifiedProps(msg: string, obj: Record<string, Date | OptionalString | boolean | number>) {
        const propStrings: string[] = Object.entries(obj).reduce(
            (propStrs, [k, v]) => {
                if (typeof v === 'string') {
                    v = quoted(v);
                } else if (isNil(v)) {
                    v = isNull(v) ? 'null' : 'undefined';
                } else if (v instanceof Date) {
                    v = quotedISOFmt(v);
                }

                propStrs.push(`${k}=${v}`);
                return propStrs;
            },
            [] as string[]
        );

        this.info(propStrings.length ? `${msg}: ${propStrings.join(', ')}` : msg);
    }

    /**
     * Logs a message with the elapsed time since {@linkcode startedAt}, optionally with additional labels/args.
     * @param {string} msg - The message to log.
     * @param {Date} [startedAt] - The start time to compute elapsed time.
     * @param {...unknown} args - Additional arguments or labels.
     */
    logTelemetry(msg: string, startedAt?: Date, ...args: unknown[]): void {
        msg = `${TELEMETRY} ${msg}`;

        if (startedAt) {
            msg += ` ${ageString(startedAt)}`;
        } else {
            this.warn(`logTelemetry() called without startedAt, no elapsed time will be logged`);
        }

        // If there's ...args and first arg is a string, assume it's a label for any other arg objects
        if (args.length && typeof args[0] == 'string') {
            msg += `, ${args.shift()}`;
        }

        this.info(msg, ...args)
    }

    /**
     * Adds a random string to the logger's prefix (useful for distinguishing logs in concurrent contexts).
     */
    tagWithRandomString(): void {
        this.logPrefix += ` *#(${createRandomString(4)})#*`;
    }

    /**
     * Returns a new {@linkcode Logger} with additional prefix arguments appended to {@linkcode this.prefixes}.
     * @param {string} arg1 - The additional prefix.
     * @param {...LoggerArg} args - More prefix arguments.
     * @returns {Logger} A new Logger instance with the extended prefix.
     */
    tempLogger(arg1: string, ...args: LoggerArg[]): Logger {
        const tempArgs = [...this.prefixes, arg1, ...args];
        return new Logger(tempArgs[0] as string, ...tempArgs.slice(1));
    }

    /**
     * Mutates {@linkcode args} array to pop the first {@linkcode Error} if it exists.
     * @private
     * @param {...unknown} args - Additional arguments.
     * @returns {string} The formatted error message.
     */
    private errorStr(...args: unknown[]): string {
        const errorArgs = this.findErrorArg(args);
        const stringArgs = errorArgs.args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg, null, 4));
        const stringArg = stringArgs.length > 0 ? stringArgs.join(', ') : undefined;

        if (errorArgs.error) {
            return this.makeErrorMsg(errorArgs.error, stringArg);
        } else {
            if (!stringArg) this.warn(`errorStr() called with no string or error args, returning empty string`);
            return stringArg || '';
        }
    }

    /**
     * Separate the {@linkcode Error} type args from the rest of the {@linkcode args}.
     * @private
     * @param {...unknown} args - Additional arguments.
     * @returns {ErrorArgs} Object with `args` containing non-Error args and `error` if an Error was found.
     */
    private findErrorArg(args: unknown[]): ErrorArgs {
        const [errorArgs, otherArgs] = split(args, arg => arg instanceof Error);

        if (errorArgs.length > 0) {
            if (errorArgs.length > 1) {
                this.warn(`findErrorArg() called with multiple Error args, only using the first one:`, errorArgs);
            }

            return {args: otherArgs, error: errorArgs[0] as Error}
        } else {
            return {args: otherArgs};
        }
    }

    /**
     * Make a custom error message.
     * @private
     * @param {Error} error - The error object.
     * @param {string} [msg] - Optional additional message.
     * @returns {string} The formatted error message.
     */
    private makeErrorMsg(error: Error, msg?: string): string {
        return msg ? `${msg} (error.message="${error.message}")` : error.message;
    }

    /**
     * Builds a dictionary of {@linkcode Logger} instances keyed by the values of a string enum.
     * @template E - The enum type.
     * @template T - The type of the enum object.
     * @param {T} strEnum The enum that will key the loggers.
     * @returns {Record<E, Logger>} Dict of Logger instances keyed by the enum values.
     */
    static buildEnumLoggers<E extends string, T extends Record<string, E>>(strEnum: T): Record<E, Logger> {
        return Object.values(strEnum).reduce((loggers, value) => {
            loggers[value] = new Logger(value);
            return loggers;
        }, {} as Record<E, Logger>);
    }

    /**
     * Returns a function that builds {@linkcode Logger} objects with the starting prefixes.
     * @param {string} name - The main name for the logger.
     * @param {...LoggerArg} prefixes - Additional prefixes.
     * @returns {(args: LoggerArg[]) => Logger} A fxn that creates {@linkcode Logger} instances.
     */
    static logBuilder(name: string, ...prefixes: LoggerArg[]): ((...args: LoggerArg[]) => Logger) {
        // I think we have to define as const before returning to get the closure to capture the name + prefixes?
        const logMaker = (...args: LoggerArg[]) => new Logger(name, ...[...prefixes, ...args]);
        return logMaker;
    }
};
