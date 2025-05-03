/*
 * Logging related methods.
 */

import { addPrefix } from './string_helpers';


// console.info() with a prefix
export const logInfo = (prefix: string, msg: string, ...args: any[]): void => {
    console.info(addPrefix(prefix, msg), ...args);
};

// console.info() with a prefix
export const logDebug = (prefix: string, msg: string, ...args: any[]): void => {
    console.debug(addPrefix(prefix, msg), ...args);
};


// Doesn't work?
// export function fxnName(): string {
//     return fxnName.caller.name;
// };


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
