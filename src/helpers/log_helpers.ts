/*
 * Logging related methods.
 */
import { Mutex, MutexInterface, Semaphore, SemaphoreInterface } from 'async-mutex';

import { ageInSeconds, ageString } from '../helpers/time_helpers';
import { Config } from '../config';
import { isDebugMode } from '../helpers/environment_helpers';

const ENABLE_TRACE_LOG = isDebugMode;

// Log prefixes
export const CLEANUP_FEED = "cleanupFeed()";
export const TRIGGER_FEED = "triggerFeedUpdate()";
export const PREP_SCORERS = "prepareScorers()";


// console.info() with a prefix
export const logInfo = (pfx: string, msg: string, ...args: any[]) => console.info(prefixed(pfx, msg), ...args);
export const logDebug = (pfx: string, msg: string, ...args: any[]) => console.debug(prefixed(pfx, msg), ...args);


// Simple log helper that only fires if numRemoved > 0
export function logTootRemoval(prefix: string, tootType: string, numRemoved: number, numTotal: number): void {
    if (numRemoved == 0) return;
    console.debug(`[${prefix}] Removed ${numRemoved} ${tootType} toots leaving ${numTotal} toots`);
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
    let logMsg = `${logPrefix} `;

    if (Array.isArray(acquireLock)) {
        logMsg += `Semaphore ${acquireLock[0]} `;
        releaseLock = acquireLock[1];
    } else {
        logMsg += `Mutex `;
        releaseLock = acquireLock;
    }

    logMsg += `lock acquired ${ageString(startedAt)}`;

    if (waitSeconds > Config.mutexWarnSeconds) {
        console.warn(logMsg);
    } else if (waitSeconds > 2) {
        console.debug(logMsg);
    }

    return releaseLock;
};


// Log only if DEBUG env var is set.
// Assumes if there's multiple args and the 2nd one is a string the 1st one is a prefix.
export function traceLog(msg: string, ...args: any[]): void {
    if (!ENABLE_TRACE_LOG) return;

    if (args.length > 0) {
        if (typeof args[0] == 'string') {
            msg = prefixed(msg, args.shift() as string);
        }
    }

    console.debug(msg, ...args);
};


// Prefix a string with [Brackets] and a space
export function prefixed(prefix: string, msg: string): string {
    prefix = prefix.startsWith("[") ? prefix : `[${prefix}]`;
    return `${prefix} ${msg}`;
};
