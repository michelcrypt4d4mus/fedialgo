/*
 * Logging related methods.
 */
import { Mutex, MutexInterface, Semaphore, SemaphoreInterface } from 'async-mutex';
import size from 'lodash/size';

import { ageInSeconds, ageString } from '../helpers/time_helpers';
import { BytesDict } from './math_helper';
import { config } from '../config';
import { isDebugMode } from '../helpers/environment_helpers';
import { sumArray } from './collection_helpers';
import { TELEMETRY, bracketed, prefixed } from './string_helpers';

export type WaitTime = {
    milliseconds: number;
    numRequests: number;
};

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


// Not 100% accurate. From https://gist.github.com/rajinwonderland/36887887b8a8f12063f1d672e318e12e
export function sizeOf(obj: any, sizes: BytesDict): number {
    if (obj === null || obj === undefined) return 0;
    let bytes = 0;

    switch (typeof obj) {
        case "number":
            bytes += 8;
            sizes.numbers += 8;
            break;
        case "string":
            const stringLength = strBytes(obj);
            bytes += stringLength;
            sizes.strings += stringLength;
            break;
        case "boolean":
            bytes += 4;
            sizes.booleans += 4;
            break;
        case "function":
            const fxnLength = strBytes(obj.toString());
            bytes += fxnLength;  // functions aren't serialized in JSON i don't think?
            sizes.functions += fxnLength;
            break;
        case "object":
            if (Array.isArray(obj)) {
                const arrayBytes = sumArray(obj.map((item) => sizeOf(item, sizes)));
                bytes += arrayBytes;
                sizes.arrays += arrayBytes;
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    const keyBytes = strBytes(key);
                    bytes += keyBytes;
                    sizes.strings += keyBytes;
                    sizes.keys += keyBytes;  // keys in objects

                    const valueBytes = sizeOf(value, sizes);
                    bytes += valueBytes;
                    sizes.objects += valueBytes;  // count objects in the size
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


// Roughly, assuming UTF-8 encoding. UTF-16 would be 2x this, emojis are 4 bytes, etc.
export const strBytes = (str: string): number => str.length;
