/*
 * Logging related methods.
 */
import { Mutex, Semaphore } from 'async-mutex';

import { ageInMS, ageInSeconds, ageString } from '../helpers/time_helpers';
import { config } from '../config';
import { isDebugMode } from '../helpers/environment_helpers';
import { Logger } from './logger';
import { TELEMETRY, bracketed, prefixed } from './string_helpers';
import { type ConcurrencyLockRelease } from '../types';

// Log prefixes
export const BACKFILL_FEED = "triggerHomeTimelineBackFill()";
export const PREP_SCORERS = "prepareScorers()";
export const TRIGGER_FEED = "triggerFeedUpdate()";


// Lock a Semaphore or Mutex and log the time it took to acquire the lock
export async function lockExecution(
    locker: Mutex | Semaphore,
    logger: Logger,
    logPrefix?: string
): Promise<ConcurrencyLockRelease> {
    const startedAt = new Date();
    const acquireLock = await locker.acquire();
    const waitSeconds = ageInSeconds(startedAt);
    let releaseLock: ConcurrencyLockRelease;
    let logMsg = logPrefix ? `${logPrefix} ` : '';

    if (Array.isArray(acquireLock)) {
        logMsg += `Semaphore ${acquireLock[0]}`;
        releaseLock = acquireLock[1];
    } else {
        logMsg += `Mutex`;
        releaseLock = acquireLock;
    }

    logMsg += ` lock acquired ${ageString(startedAt)}`;

    if (waitSeconds > config.api.mutexWarnSeconds) {
        logger.warn(logMsg);
    } else if (waitSeconds > 2) {
        logger.trace(logMsg);
    }

    return releaseLock;
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

    ageString(): string {
        return ageString(this.startedAt);
    }

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
