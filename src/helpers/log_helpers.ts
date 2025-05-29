/*
 * Logging related methods.
 */
import { Mutex, MutexInterface, Semaphore, SemaphoreInterface } from 'async-mutex';

import { ageInMS, ageInSeconds, ageString } from '../helpers/time_helpers';
import { config } from '../config';
import { isDebugMode } from '../helpers/environment_helpers';
import { TELEMETRY, bracketed, prefixed } from './string_helpers';

// Log prefixes
export const BACKFILL_FEED = "triggerHomeTimelineBackFill()";
export const CLEANUP_FEED = "cleanupFeed()";
export const PREP_SCORERS = "prepareScorers()";
export const TRIGGER_FEED = "triggerFeedUpdate()";

// console.log methods with a prefix
export const logDebug = (pfx: string, msg: string, ...args: any[]) => console.debug(prefixed(pfx, msg), ...args);
export const logInfo = (pfx: string, msg: string, ...args: any[]) => console.info(prefixed(pfx, msg), ...args);


// Lock a Semaphore or Mutex and log the time it took to acquire the lock
export async function lockExecution(
    locker: Mutex | Semaphore,
    logPrefix: string
): Promise<MutexInterface.Releaser | SemaphoreInterface.Releaser> {
    const startedAt = new Date();
    const acquireLock = await locker.acquire();
    const waitSeconds = ageInSeconds(startedAt);
    let releaseLock: MutexInterface.Releaser |SemaphoreInterface.Releaser;
    let logMsg = bracketed(logPrefix);

    if (Array.isArray(acquireLock)) {
        logMsg += ` Semaphore ${acquireLock[0]}`;
        releaseLock = acquireLock[1];
    } else {
        logMsg += ` Mutex`;
        releaseLock = acquireLock;
    }

    logMsg += ` lock acquired ${ageString(startedAt)}`;

    if (waitSeconds > config.api.mutexWarnSeconds) {
        console.warn(logMsg);
    } else if (waitSeconds > 2) {
        traceLog(logMsg);
    }

    return releaseLock;
};


// Log an error message and throw an Error
export function logAndThrowError(message: string, obj?: any): never {
    if (obj) {
        console.error(message, obj);
        message += `\n${JSON.stringify(obj, null, 4)}`;
    } else {
        console.error(message);
    }

    throw new Error(message);
};


// Log a message with a telemetry timing suffix
export function logTelemetry(logPrefix: string, msg: string, startedAt: Date, ...args: any[]): void {
    msg = `${TELEMETRY} ${msg} ${ageString(startedAt)}`;

    // If there's ...args and first arg is a string, assume it's a label for any other arg objects
    if (args.length && typeof args[0] == 'string') {
        msg += `, ${args.shift()}`;
    }

    logInfo(logPrefix, msg, ...args);
};


// Simple log helper that only fires if numRemoved > 0
export function logTootRemoval(prefix: string, tootType: string, numRemoved: number, numTotal: number): void {
    if (numRemoved == 0) return;
    console.debug(`${bracketed(prefix)} Removed ${numRemoved} ${tootType} toots leaving ${numTotal} toots`);
};


// Log only if FEDIALGO_DEBUG env var is set to "true"
// Assumes if there's multiple args and the 2nd one is a string the 1st one is a prefix.
export function traceLog(msg: string, ...args: any[]): void {
    if (!isDebugMode) return;

    if (args.length > 0) {
        if (typeof args[0] == 'string') {
            msg = prefixed(msg, args.shift() as string);
        }
    }

    console.debug(msg, ...args);
};


// Roughly, assuming UTF-8 encoding. UTF-16 would be 2x this, emojis are 4 bytes, etc.
export const strBytes = (str: string): number => str.length;


// Helper class for telemetry
export class WaitTime {
    avgMsPerRequest: number = 0;
    milliseconds: number = 0;
    numRequests: number = 0;
    startedAt: Date = new Date();  // TODO: this shouldn't really be set yet...

    markStart(): void {
        this.startedAt = new Date();
    }

    markEnd(): void {
        this.milliseconds += ageInMS(this.startedAt);
        this.numRequests++;
        this.avgMsPerRequest = this.milliseconds / this.numRequests;
    }

    toDict(): Record<string, number> {
        return {
            avgMsPerRequest: this.avgMsPerRequest,
            milliseconds: this.milliseconds,
            numRequests: this.numRequests
        };
    }
};



// Log lines with "[DEMO APP] <ComponentName>" prefixed
// TODO: Move to its own file
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

    error(msg: string, ...args: any[]) {
        console.error(this.makeMsg(msg), ...args);
    }

    warn(msg: string, ...args: any[]) {
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

    // Only writes logs in debug mode
    trace(msg: string, ...args: any[]) {
        if (!isDebugMode) return;
        this.debug(msg, ...args);
    }

    private makeMsg(msg: string): string {
        return `${this.logPrefix} ${msg}`;
    }
};
