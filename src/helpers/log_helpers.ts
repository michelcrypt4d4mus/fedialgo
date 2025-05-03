/*
 * Logging related methods.
 */
import { Mutex, MutexInterface, Semaphore, SemaphoreInterface } from 'async-mutex';

import Storage from '../Storage';
import { ageInSeconds, ageString } from '../helpers/time_helpers';
import { isDebugMode } from '../helpers/environment_helpers';

const ENABLE_TRACE_LOG = isDebugMode();


// console.info() with a prefix
export const logInfo = (prefix: string, msg: string, ...args: any[]): void => {
    console.info(addPrefix(prefix, msg), ...args);
};

// console.info() with a prefix
export const logDebug = (prefix: string, msg: string, ...args: any[]): void => {
    console.debug(addPrefix(prefix, msg), ...args);
};


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


export async function lockMutex(mutex: Mutex, logPrefix: string): Promise<MutexInterface.Releaser> {
    const startedAt = new Date();
    const releaseMutex = await mutex.acquire();
    const waitSeconds = ageInSeconds(startedAt);
    const logMsg = `${logPrefix} Mutex lock acquired ${ageString(startedAt)}`;

    if (waitSeconds > Storage.getConfig().mutexWarnSeconds) {
        console.warn(logMsg);
    } else if (waitSeconds > 2) {
        console.debug(logMsg);
    }

    return releaseMutex;
};


export async function lockSemaphore(semaphore: Semaphore, logPrefix: string): Promise<[number, SemaphoreInterface.Releaser]> {
    const startedAt = new Date();
    const release: [number, SemaphoreInterface.Releaser] = await semaphore.acquire();
    const waitSeconds = ageInSeconds(startedAt);
    const logMsg = `${logPrefix} Semaphore ${release[0]} lock acquired ${ageString(startedAt)}`;

    if (waitSeconds > Storage.getConfig().mutexWarnSeconds) {
        console.warn(logMsg);
    } else if (waitSeconds > 2) {
        console.debug(logMsg);
    }

    return release;
};


// Log only if DEBUG env var is set.
// Assumes if there's multiple args and the 2nd one is a string the 1st one is a prefix.
export function traceLog(msg: string, ...args: any[]): void {
    if (!ENABLE_TRACE_LOG) return;

    if (args.length > 0) {
        if (typeof args[0] == 'string') {
            msg = addPrefix(msg, args.shift() as string);
        }
    }

    console.debug(msg, ...args);
};


// Prefix a string with [Brackets] and a space
export function addPrefix(prefix: string, msg: string): string {
    prefix = prefix.startsWith("[") ? prefix : `[${prefix}]`;
    return `${prefix} ${msg}`;
};
