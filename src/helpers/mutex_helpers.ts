/*
 * Logging related methods.
 */
import { Mutex, Semaphore } from 'async-mutex';

import { ageInSeconds, ageString } from './time_helpers';
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
    const waitSeconds = ageInSeconds(startedAt);

    if (waitSeconds > config.api.mutexWarnSeconds) {
        logger.debug(logMsg);
    } else if (waitSeconds > (config.api.mutexWarnSeconds / 2)) {
        logger.deep(logMsg);
    }

    return releaseLock;
};
