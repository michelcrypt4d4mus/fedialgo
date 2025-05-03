/*
 * Logging related methods.
 */
import Storage from '../Storage';
import { addPrefix } from './string_helpers';
import { ageInSeconds, inSeconds } from '../helpers/time_helpers';


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


export function checkMutexWaitTime(waitStartedAt: Date, logPrefix: string): void {
    if (ageInSeconds(waitStartedAt) > Storage.getConfig().mutexWarnSeconds) {
        console.warn(`${logPrefix} Mutex ${inSeconds(waitStartedAt)}!`);
    }
};
