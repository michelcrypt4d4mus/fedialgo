/*
 * Logging related methods.
 */
import { Mutex, Semaphore } from 'async-mutex';

import Logger from './logger';
import { ageInMS, ageInSeconds, ageString } from '../helpers/time_helpers';
import { config } from '../config';
import { type ConcurrencyLockRelease } from '../types';

// Log prefixes
export const BACKFILL_FEED = "triggerHomeTimelineBackFill";
export const PREP_SCORERS = "prepareScorers";
export const TRIGGER_FEED = "triggerFeedUpdate";


/**
 * Lock a Semaphore or Mutex and log the time it took to acquire the lock
 * @param {Mutex | Semaphore} locker - The lock to acquire
 * @param {Logger} [logger] - Optional logger to use; defaults to a new Logger instance
 * @returns {Promise<ConcurrencyLockRelease>} A promise that resolves to a function to release the lock
 */
export async function lockExecution(locker: Mutex | Semaphore, logger?: Logger): Promise<ConcurrencyLockRelease> {
    logger ||= new Logger("lockExecution");
    logger.deep(`lockExecution called...`);
    const startedAt = new Date();
    const acquireLock = await locker.acquire();
    const waitSeconds = ageInSeconds(startedAt);
    let releaseLock: ConcurrencyLockRelease;
    let logMsg: string;

    if (Array.isArray(acquireLock)) {
        logMsg = `Semaphore ${acquireLock[0]}`;
        releaseLock = acquireLock[1];
    } else {
        logMsg = `Mutex`;
        releaseLock = acquireLock;
    }

    logMsg += ` lock acquired ${ageString(startedAt)}`;

    if (waitSeconds > config.api.mutexWarnSeconds) {
        logger.warn(logMsg);
    } else if (waitSeconds > 2) {
        logger.deep(logMsg);
    }

    return releaseLock;
};


// Helper class for telemetry
export class WaitTime {
    avgMsPerRequest: number = 0;
    logger = new Logger("WaitTime");
    milliseconds: number = 0;
    numRequests: number = 0;
    startedAt: Date = new Date();  // TODO: this shouldn't really be set yet...

    ageInSeconds(): number {
        if (!this.startedAt) {
            this.logger.warn(`No startedAt set for WaitTime so can't compute ageInSeconds()`);
            return 0;
        }

        return ageInSeconds(this.startedAt);
    }

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
