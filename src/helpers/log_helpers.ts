/*
 * Logging related methods.
 */
import { Mutex, MutexInterface, Semaphore, SemaphoreInterface } from 'async-mutex';

import { ageInSeconds, ageString } from '../helpers/time_helpers';
import { config } from '../config';
import { isDebugMode } from '../helpers/environment_helpers';
import { sumArray } from './collection_helpers';
import { TELEMETRY, bracketed } from './string_helpers';

// Log prefixes
export const BACKFILL_FEED = "triggerHomeTimelineBackFill()";
export const CLEANUP_FEED = "cleanupFeed()";
export const PREP_SCORERS = "prepareScorers()";
export const TRIGGER_FEED = "triggerFeedUpdate()";

// console.log methods with a prefix
export const logDebug = (pfx: string, msg: string, ...args: any[]) => console.debug(prefixed(pfx, msg), ...args);
export const logInfo = (pfx: string, msg: string, ...args: any[]) => console.info(prefixed(pfx, msg), ...args);


// Log a message with a telemetry timing suffix
export function logTelemetry(
    logPrefix: string,
    msg: string,
    startedAt: Date,
    ...args: any[]
): void {
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


// Lock a Semaphore or Mutex and log the time it took to acquire the lock
export async function lockExecution(
    locker: Mutex | Semaphore,
    logPrefix: string
): Promise<MutexInterface.Releaser |  SemaphoreInterface.Releaser> {
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

// Not 100% accurate. From https://gist.github.com/rajinwonderland/36887887b8a8f12063f1d672e318e12e
export function sizeOf(obj: any): number {
    var bytes = 0;
    if (obj === null || obj === undefined) return bytes;

    switch (typeof obj) {
        case "number":
            bytes += 8;
            break;
        case "string":
            bytes += strBytes(obj);
            break;
        case "boolean":
            bytes += 4;
            break;
        case "function":
            bytes += strBytes(obj.toString());
        case "object":
            if (Array.isArray(obj)) {
                bytes += sumArray(obj.map(sizeOf));
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    bytes += strBytes(key);
                    bytes += sizeOf(value);
                });
            }

            break;
        default:
            console.warn(`sizeOf() unknown type: ${typeof obj}`);
            bytes += strBytes(obj.toString());
            break;
    }

    return bytes;
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


// Prefix a string with [Brackets] and a space
export function prefixed(prefix: string, msg: string): string {
    return `${bracketed(prefix)} ${msg}`;
};


// Roughly, assuming UTF-8 encoding. UTF-16 would be 2x this, emojis are 4 bytes, etc.
const strBytes = (str: string): number => str.length;
