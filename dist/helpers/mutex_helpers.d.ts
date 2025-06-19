import { Mutex, Semaphore } from 'async-mutex';
import { Logger } from './logger';
import { type ConcurrencyLockRelease } from '../types';
/**
 * Lock a Semaphore or Mutex and log the time it took to acquire the lock
 * @param {Mutex | Semaphore} locker - The lock to acquire
 * @param {Logger} [logger] - Optional logger to use; defaults to a new Logger instance
 * @returns {Promise<ConcurrencyLockRelease>} A promise that resolves to a function to release the lock
 */
export declare function lockExecution(locker: Mutex | Semaphore, logger?: Logger): Promise<ConcurrencyLockRelease>;
