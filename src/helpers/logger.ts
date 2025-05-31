/*
 * Standardized logger
 */
import { bracketed, createRandomString, isEmptyStr } from './string_helpers';
import { isDebugMode } from './environment_helpers';


// Log lines with "[ComponentName] <Subtitle> (subsubtitle)" prefix
export class ComponentLogger {
    componentName: string;
    logPrefix: string;
    subtitle?: string;
    subsubtitle?: string;

    constructor(componentName: string, subtitle?: string, subsubtitle?: string) {
        this.componentName = componentName;
        this.subtitle = subtitle;
        this.subsubtitle = subsubtitle;
        this.logPrefix = bracketed(componentName) + (subtitle ? ` <${subtitle}>` : "");
        this.logPrefix += (subsubtitle ? ` (${subsubtitle})` : "");
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
};
