/*
 * Standardized logger
 */
import { ageString } from './time_helpers';
import { isDebugMode } from './environment_helpers';
import { TELEMETRY, arrowed, bracketed, createRandomString, isEmptyStr } from './string_helpers';

const PREFIXERS = [
    bracketed,
    arrowed,
    (str: string) => `{${str}}`,
    (str: string) => `(${str})`,
    (str: string) => `#${str}#`,
    (str: string) => `*${str}*`,
    (str: string) => `~${str}~`,
    (str: string) => `-${str}-`,
];


// Log lines with "[ComponentName] <Subtitle> (subsubtitle)" prefix
export class Logger {
    logPrefix: string;
    prefixes: string[];

    constructor(componentName: string, ...args: string[]) {
        this.prefixes = [componentName, ...args]
        this.logPrefix = this.prefixes.map((str, i) => PREFIXERS[i] ? PREFIXERS[i](str) : str).join(' ');

        if (this.prefixes.length > PREFIXERS.length) {
            this.warn(`Logger created with too many prefixes: ${this.prefixes}`);
        }
    }

    // If first arg is a string, check if 2nd arg is an Error and do some special formatting
    // Returns the error message in case it's of use.
    error(msg: string | Error, ...args: any[]): string {
        if (msg instanceof Error) {
            console.error(this.makeMsg(msg.message), ...args);
            return msg.message;
        }

        msg = this.getErrorMessage(msg, ...args);
        console.error(this.makeMsg(msg), ...args);
        return msg;
    }

    // Also checks the first argument for an Error but first arg must be a string
    warn(msg: string, ...args: any[]) {
        msg = this.getErrorMessage(msg, ...args);
        console.warn(this.makeMsg(msg), ...args);
    }

    log(msg: string, ...args: any[]) {
        console.log(this.makeMsg(msg), ...args);
    }

    logTelemetry(msg: string, startedAt: Date, ...args: any[]): void {
        msg = `${TELEMETRY} ${msg} ${ageString(startedAt)}`;

        // If there's ...args and first arg is a string, assume it's a label for any other arg objects
        if (args.length && typeof args[0] == 'string') {
            msg += `, ${args.shift()}`;
        }

        this.info(msg, ...args)
    }

    info(msg: string, ...args: any[]) {
        console.info(this.makeMsg(msg), ...args);
    }

    debug(msg: string, ...args: any[]) {
        console.debug(this.makeMsg(msg), ...args);
    }

    // Only writes logs when FEDIALGO_DEBUG env var is set
    trace(msg: string, ...args: any[]) {
        isDebugMode && this.debug(msg, ...args);
    }

    // Fill in first available prefix slot with string
    tempLogger(prefix: string): Logger {
        const args = [...this.prefixes, prefix];
        return new Logger(args[0], ...args.slice(1));
    }

    // Can be helpful when there's a lot of threads and you want to distinguish them
    tagWithRandomString(): void {
        this.logPrefix += ` *#(${createRandomString(4)})#*`;
    }

    // Mutates args array to pop the first Error if it exists
    private getErrorMessage(msg: string, ...args: any[]): string {
        if (args[0] instanceof Error) {
            return this.makeErrorMsg(args.shift() as Error, msg);
        } else {
            return msg;
        }
    }

    private makeErrorMsg(error: Error, msg?: string): string {
        return msg ? `${msg} (error.message="${error.message}")` : error.message;
    }

    private makeMsg(msg: string | undefined): string {
        return this.logPrefix + (isEmptyStr(msg) ? '' : ` ${msg}`);
    }

    // Returns a function that will build Logger objects with the starting prefixes
    static logBuilder(componentName: string, ...prefixes: string[]): ((...args: string[]) => Logger) {
        return (...args: string[]) => {
            return new Logger(componentName, ...[...prefixes, ...args]);
        };
    }
};
