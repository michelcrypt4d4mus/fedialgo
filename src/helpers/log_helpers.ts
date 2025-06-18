/*
 * Logging related methods.
 */
import { Mutex, Semaphore } from 'async-mutex';

import { ageInMS, ageInSeconds, ageString } from '../helpers/time_helpers';
import { config } from '../config';
import { Logger } from './logger';
import { type ConcurrencyLockRelease } from '../types';


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


/** Helper class for telemetry.  */
export class WaitTime {
    avgMsPerRequest: number = 0;
    milliseconds: number = 0;
    numRequests: number = 0;
    startedAt: Date = new Date();  // TODO: this shouldn't really be set yet...

    ageInSeconds(): number {
        return ageInSeconds(this.startedAt);
    }

    ageString(): string {
        return ageString(this.startedAt);
    }

    markStart(): void {
        this.startedAt = new Date();
    }

    markEnd(): void {
        this.numRequests++;
        this.milliseconds += ageInMS(this.startedAt);
        this.avgMsPerRequest = this.milliseconds / this.numRequests;
    }
};
