import { Mutex, Semaphore } from 'async-mutex';
import { Logger } from './logger';
import { type ConcurrencyLockRelease } from '../types';
export declare const BACKFILL_FEED = "triggerHomeTimelineBackFill";
export declare const PREP_SCORERS = "prepareScorers";
export declare const TRIGGER_FEED = "triggerFeedUpdate";
/**
 * Lock a Semaphore or Mutex and log the time it took to acquire the lock
 * @param {Mutex | Semaphore} locker - The lock to acquire
 * @param {Logger} [logger] - Optional logger to use; defaults to a new Logger instance
 * @returns {Promise<ConcurrencyLockRelease>} A promise that resolves to a function to release the lock
 */
export declare function lockExecution(locker: Mutex | Semaphore, logger?: Logger): Promise<ConcurrencyLockRelease>;
export declare class WaitTime {
    avgMsPerRequest: number;
    logger: Logger;
    milliseconds: number;
    numRequests: number;
    startedAt: Date;
    ageInSeconds(): number;
    ageString(): string;
    markStart(): void;
    markEnd(): void;
    toDict(): Record<string, number>;
}
