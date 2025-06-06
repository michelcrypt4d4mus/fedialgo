/*
 * Standardized logger.
 */
import { ageString } from './time_helpers';
import { isDebugMode, isDeepDebug } from './environment_helpers';
import { split } from './collection_helpers';
import { TELEMETRY, arrowed, bracketed, createRandomString, isEmptyStr } from './string_helpers';

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
];


// Log lines with "[ComponentName] <Subtitle> (subsubtitle)" prefix
export class Logger {
    logPrefix: string;
    prefixes: string[];

    constructor(name: string, ...args: string[]) {
        this.prefixes = [name, ...args]
        this.logPrefix = this.prefixes.map((str, i) => PREFIXERS[i] ? PREFIXERS[i](str) : str).join(' ');

        if (this.prefixes.length > PREFIXERS.length) {
            this.warn(`Logger created with too many prefixes: ${this.prefixes}`);
        }
    }

    // Alternate constructor; makes the first two arguments into a parenthesized bracketed string
    // e.g. Logger("ComponentName", "domain") -> "[ComponentName<domain>] "
    static withParenthesizedName(name: string, parenthesized: string, ...args: string[]): Logger {
        return new Logger(`${name} ${arrowed(parenthesized)}`, ...args)
    }

    // If first arg is a string, check if 2nd arg is an Error and do some special formatting
    // Returns the error message in case it's of use.
    error(msg: string | Error, ...args: any[]): string {
        if (msg instanceof Error) {
            console.error(this.str(msg.message), ...args);
            return msg.message;
        }

        msg = this.errorStr(msg, ...args);
        console.error(this.str(msg), ...args);
        return msg;
    }

    // warn() also checks the first argument for an Error but first arg must be a string
    warn =  (msg: string, ...args: any[]) => console.warn(this.str(this.errorStr(msg, ...args)), ...args);
    log =   (msg: string, ...args: any[]) => console.log(this.str(msg), ...args);
    info =  (msg: string, ...args: any[]) => console.info(this.str(msg), ...args);
    debug = (msg: string, ...args: any[]) => console.debug(this.str(msg), ...args);
    trace = (msg: string, ...args: any[]) => {(isDebugMode || isDeepDebug) && this.debug(msg, ...args)};
    deep =  (msg: string, ...args: any[]) => {isDeepDebug && this.debug(msg, ...args)};

    // Not a real warning, just a log with a warning prefix in colored text
    warnWithoutTrace = (msg: string, ...args: any[]) => console.log(`%cWarning: ${msg}`, 'color: orange;');

    // Log an error message and throw an Error with the stringified args and the message.
    logAndThrowError(msg: string, ...args: any[]): never {
        console.error(msg, args);

        if (args.length > 0) {
            const [errorArgs, otherArgs] = split(args, arg => arg instanceof Error);

            if (errorArgs.length > 0) {
                msg = this.makeErrorMsg(errorArgs[0], msg);
            }

            if (otherArgs.length > 0) {
                msg += [`, additional args:`, ...args.map(arg => JSON.stringify(arg, null, 4))].join(`\n`);
            }
        }

        throw new Error(msg);
    }

    // Log the fact that an array was reduced in size.
    logArrayReduction<T>(before: T[], after: T[], objType: string, reason?: string): void {
        const numRemoved = before.length - after.length;
        if (numRemoved == 0) return;
        this.trace(`Removed ${numRemoved} ${ reason ? (reason + " ") : ""}${objType}s leaving ${after.length}`);
    }

    // Log a message with the amount of time from startedAt to now.
    logTelemetry(msg: string, startedAt: Date, ...args: any[]): void {
        msg = `${TELEMETRY} ${msg} ${ageString(startedAt)}`;

        // If there's ...args and first arg is a string, assume it's a label for any other arg objects
        if (args.length && typeof args[0] == 'string') {
            msg += `, ${args.shift()}`;
        }

        this.info(msg, ...args)
    }

    // Add a random string to the prefix. Can be helpful when there's a lot of threads w/same prefix.
    tagWithRandomString(): void {
        this.logPrefix += ` *#(${createRandomString(4)})#*`;
    }

    // Returns new Logger with one additional prefix.
    tempLogger(...args: string[]): Logger {
        args = [...this.prefixes, ...args];
        return new Logger(args[0], ...args.slice(1));
    }

    // Mutates args array to pop the first Error if it exists
    private errorStr(msg: string, ...args: any[]): string {
        if (args[0] instanceof Error) {
            return this.makeErrorMsg(args.shift() as Error, msg);
        } else {
            return msg;
        }
    }

    // Make a custom error message
    private makeErrorMsg(error: Error, msg?: string): string {
        return msg ? `${msg} (error.message="${error.message}")` : error.message;
    }

    // Concatenate prefix and strings
    str(msg: string | undefined): string {
        return this.logPrefix + (isEmptyStr(msg) ? '' : ` ${msg}`);
    }

    // Returns a function that will build Logger objects with the starting prefixes
    static logBuilder(name: string, ...prefixes: string[]): ((...args: string[]) => Logger) {
        // I think we have to define as const before returning to get the closure to capture the name + prefixes?
        const logMaker = (...args: string[]) => {
            const loggerArgs = [...prefixes, ...args];
            return new Logger(name, ...loggerArgs);
        };

        return logMaker;
    }
};
